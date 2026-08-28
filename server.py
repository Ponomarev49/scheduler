from pulp import LpMaximize, LpProblem, LpVariable, lpSum, LpBinary, PULP_CBC_CMD
from flask_cors import CORS
from flask import Flask, request, jsonify
from datetime import datetime

class Team:
    def __init__(self, id: int, name: str, arrivalTime: str):
        self.id = id
        self.name = name
        self.arrivalTime = arrivalTime


class Match:
    def __init__(self, category: str, group: str, team1: Team, team2: Team, time: str):
        self.category = category
        self.group = group
        self.team1 = team1
        self.team2 = team2
        self.time = time


def gen_timetable(group_stage, play_off, time_slots):
    # Привязка времени к матчам
    for match in group_stage:
        if match['time']:
            match['time'] = match['time'].replace('T', ' ').replace('Z', '')[:-7]
            match['time'] = datetime.strptime(match['time'], "%Y-%m-%d %H:%M")
            for i in range(len(time_slots)):
                if match['time'] < time_slots[i]:
                    match['time'] = time_slots[i]
                    break

    teams = {(m['category'], m['team1']['id']) for m in group_stage}.union({(m['category'], m['team2']['id']) for m in group_stage})

    # Определение дней
    days = sorted({s.date() for s in time_slots})
    if len(days) > 1:
        second_last_day = days[-2]
        last_day = days[-1]

    # Создание модели линейного программирования
    model = LpProblem("Match_Scheduling", LpMaximize)

    # Преобразование в массив объектов Match
    matches = [
        Match(
            category=item["category"],
            group=item["group"],
            team1=Team(**item["team1"]),
            team2=Team(**item["team2"]),
            time=item["time"] if item["time"] else None
        )
        for item in group_stage
    ]

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
                           if (m.category, m.team1.id) == team or (m.category, m.team2.id) == team
                           for s in day_slots) <= 2

            # Каждая команда не может играть два матча подряд
            for i, s in enumerate(day_slots[:-1]):
                model += lpSum(x[(m, s)] + x[(m, day_slots[i + 1])]
                               for m in matches
                               if (m.category, m.team1.id) == team or (m.category, m.team2.id) == team) <= 1

    # Ограничения для предпоследнего и последнего дня
    if len(days) > 1:
        # Для предпоследнего дня команды могут сыграть максимум 1 матч
        for team in teams:
            model += lpSum(x[(m, s)] for m in matches if (m.category, m.team1.id) == team or (m.category, m.team2.id) == team
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
        [(m.category, m.group, m.team1.name, m.team2.name, s.strftime("%Y-%m-%d %H:%M"))
         for m in matches for s in time_slots if x[(m, s)].value() == 1],
        key=lambda item: datetime.strptime(item[4], "%Y-%m-%d %H:%M")
    )

    schedule1 = [
        {
            "category": match[0],
            "group": match[1],
            "team1": match[2],
            "team2": match[3],
            "time": match[4]
        }
        for match in schedule
    ]
    return  schedule1


app = Flask(__name__)
CORS(app)  # Разрешает запросы со всех источников

@app.route('/schedule', methods=['POST'])
def get_schedule():
    data = request.json  # Получаем JSON-данные
    group_stage = data.get('group_stage', [])
    play_off = data.get('play_off', [])
    time_slots = [datetime.strptime(slot, "%Y-%m-%dT%H:%M:%S.%fZ") for slot in data.get('time_slots', [])]

    # Вызываем функцию из main.py
    schedule = gen_timetable(group_stage, play_off, time_slots)

    return jsonify(schedule)  # Отправляем расписание клиенту

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)


