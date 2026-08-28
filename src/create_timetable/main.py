from datetime import datetime
from pulp import LpMaximize, LpProblem, LpVariable, lpSum, LpBinary, PULP_CBC_CMD

def gen_timetable(group_stage, play_off, time_slots):
    # Привязка времени к матчам
    print(time_slots[0])
    for match in group_stage:
        if match.time:
            match.time = datetime.strptime(match, "%Y-%m-%d %H:%M")
            for i in range(len(time_slots)):
                if match.time < time_slots[i]:
                    match.time = time_slots[i]
                    break


    matches = group_stage
    teams = {(m.category, m.team1['id']) for m in matches}.union({(m.category, m.team2['id']) for m in matches})

    # Определение дней
    days = sorted({s.date() for s in time_slots})
    if len(days) > 1:
        second_last_day = days[-2]
        last_day = days[-1]

    # Создание модели линейного программирования
    model = LpProblem("Match_Scheduling", LpMaximize)

    # Создание переменных для каждого матча и временного слота
    x = {(m, s): LpVariable(f"x_{i}_{j}", cat=LpBinary)
         for i, m in enumerate(matches) for j, s in enumerate(time_slots)}

    # Целевая функция — максимизировать количество поздних временных слотов
    model += lpSum((len(time_slots) - j) * x[(m, s)] for m in matches for j, s in enumerate(time_slots))

    # Ограничения:
    # Каждый матч должен быть запланирован на один временной слот
    for m in matches:
        model += lpSum(x[(m, s)] for s in time_slots) == 1

    # Если матч имеет фиксированное время, он не может быть назначен до этого времени
    for m in matches:
        if m.time is not None:
            for s in time_slots:
                if s < m.time:
                    model += x[(m, s)] == 0

    # Каждая команда не может играть более 2 матчей в день
    for team in teams:
        for day in days:
            day_slots = [s for s in time_slots if s.date() == day]
            model += lpSum(x[(m, s)] for m in matches
                           if (m.category, m.team1['id']) == team or (m.category, m.team2['id']) == team
                           for s in day_slots) <= 2

            # Каждая команда не может играть два матча подряд
            for i, s in enumerate(day_slots[:-1]):
                model += lpSum(x[(m, s)] + x[(m, day_slots[i + 1])]
                               for m in matches
                               if (m.category, m.team1['id']) == team or (m.category, m.team2['id']) == team) <= 1

    # Ограничения для предпоследнего и последнего дня
    if len(days) > 1:
        # Для предпоследнего дня команды могут сыграть максимум 1 матч
        for team in teams:
            model += lpSum(x[(m, s)] for m in matches if (m.category, m.team1['id']) == team or (m.category, m.team2['id']) == team
                           for s in time_slots if s.date() == second_last_day) <= 1

        # Последний день остается пустым (нет матчей)
        model += lpSum(x[(m, s)] for m in matches for s in time_slots if s.date() == last_day) == 0

    # Ограничение, что в каждый временной слот может быть только один матч
    for s in time_slots:
        model += lpSum(x[(m, s)] for m in matches) <= 1

    # Решение модели
    model.solve(PULP_CBC_CMD())

    # Генерация расписания
    schedule = sorted(
        [(m.category, m.group, m.team1['name'], m.team2['name'], s.strftime("%Y-%m-%d %H:%M"))
         for m in matches for s in time_slots if x[(m, s)].value() == 1],
        key=lambda item: datetime.strptime(item[4], "%Y-%m-%d %H:%M")
    )
    return  schedule
