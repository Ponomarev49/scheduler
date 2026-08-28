import glpk from "glpk.js";

// Функция создания расписания
export async function createTournamentTimetable(jsonData: any) {
  const glpkInstance = await glpk(); // Инициализация solver'а

  const groupStage = jsonData.matches;
  const timeSlots = jsonData.hallAvailability.map((t: string) => new Date(t));

  let matches = groupStage;
  let teams = new Set(matches.flatMap((m: any) => [m.team1.id, m.team2.id]));

  // Формируем модель линейного программирования
  let model = {
    name: "Match_Scheduling",
    objective: {
      direction: glpkInstance.GLP_MAX,
      name: "maximize_late_slots",
      coef: {},
    },
    subjectTo: [],
    binaries: [],
  };

  // Создаем переменные x_(match,slot)
  matches.forEach((match: any, i: number) => {
    timeSlots.forEach((slot: Date, j: number) => {
      let varName = `x_${i}_${j}`;
      model.binaries.push(varName);
      model.objective.coef[varName] = timeSlots.length - j; // Чем позже, тем лучше

      // Ограничение: каждый матч должен быть в одном слоте
      model.subjectTo.push({
        name: `one_slot_per_match_${i}`,
        vars: timeSlots.map((_, j) => `x_${i}_${j}`),
        coef: timeSlots.map(() => 1),
        bnds: { type: glpkInstance.GLP_FX, ub: 1, lb: 1 },
      });

      // Если матч фиксирован во времени, исключаем ранние слоты
      if (match.time) {
        let matchTime = new Date(match.time);
        if (slot < matchTime) {
          model.subjectTo.push({
            name: `fixed_time_${i}_${j}`,
            vars: [varName],
            coef: [1],
            bnds: { type: glpkInstance.GLP_FX, ub: 0, lb: 0 },
          });
        }
      }
    });
  });

  // Ограничение: каждая команда играет максимум 2 матча в день
  teams.forEach((teamId) => {
    let teamMatches = matches.filter(
      (m: any) => m.team1.id === teamId || m.team2.id === teamId
    );

    timeSlots.forEach((slot, j) => {
      let vars = teamMatches.map((m, i) => `x_${i}_${j}`);
      model.subjectTo.push({
        name: `max_2_matches_per_day_${teamId}_${j}`,
        vars,
        coef: vars.map(() => 1),
        bnds: { type: glpkInstance.GLP_UP, ub: 2, lb: 0 },
      });
    });
  });

  // Ограничение: один матч на один временной слот
  timeSlots.forEach((_, j) => {
    model.subjectTo.push({
      name: `one_match_per_slot_${j}`,
      vars: matches.map((_, i) => `x_${i}_${j}`),
      coef: matches.map(() => 1),
      bnds: { type: glpkInstance.GLP_UP, ub: 1, lb: 0 },
    });
  });

  // Запускаем solver
  let solution = await glpkInstance.solve(model);

  // Обрабатываем решение
  let schedule: any[] = [];
  matches.forEach((match, i) => {
    timeSlots.forEach((slot, j) => {
      if (solution.result.vars[`x_${i}_${j}`] === 1) {
        schedule.push({
          category: match.category,
          team1: match.team1.name,
          team2: match.team2.name,
          time: slot.toISOString(),
        });
      }
    });
  });

  return schedule;
}
