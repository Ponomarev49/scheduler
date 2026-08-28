"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMatches = addMatches;
var tournamentTest_json_1 = require("./tournamentTest.json"); // Убедись, что JSON файл доступен
// Функция прибавления часа к позднему времени
function addHourToLatest(date1, date2) {
    var d1 = new Date(date1);
    var d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        return "";
    }
    return new Date(Math.max(d1.getTime(), d2.getTime()) + 60 * 60 * 1000).toISOString();
}
// Функция создания матча с учетом прибытия команд
function createMatch(category, group, teams) {
    var team1Arrives = new Date(teams[0].arrivalTime).getTime();
    var team2Arrives = new Date(teams[1].arrivalTime).getTime();
    if (isNaN(team1Arrives) && isNaN(team2Arrives)) {
        return { category: category, group: group, team1: teams[0], team2: teams[1], time: null };
    }
    var possibleTimeStart;
    if (isNaN(team1Arrives)) {
        possibleTimeStart = new Date(team2Arrives + 60 * 60 * 1000).toISOString();
    }
    else if (isNaN(team2Arrives)) {
        possibleTimeStart = new Date(team1Arrives + 60 * 60 * 1000).toISOString();
    }
    else {
        possibleTimeStart = addHourToLatest(teams[0].arrivalTime, teams[1].arrivalTime);
    }
    return { category: category, group: group, team1: teams[0], team2: teams[1], time: new Date(possibleTimeStart) };
}
// Генерация матчей для группового этапа и плей-офф
function addMatches(jsonData) {
    var groupStage = [];
    var playOff = [];
    jsonData.categories.forEach(function (category) {
        category.groups.forEach(function (group) {
            var teams = group.teams;
            for (var i = 0; i < teams.length; i++) {
                for (var j = i + 1; j < teams.length; j++) {
                    groupStage.push(createMatch(category.name, group.name, [teams[i], teams[j]]));
                }
            }
        });
        if (category.stages.quarterfinal) {
            for (var i = 0; i < 4; i++) {
                playOff.push({
                    category: category.name,
                    group: "quarterfinal",
                    team1: { id: 100 + i, name: "Четвертьфиналист1", arrivalTime: "Местная" },
                    team2: { id: 1000 + i, name: "Четвертьфиналист2", arrivalTime: "Местная" },
                    time: null,
                });
            }
        }
        if (category.stages.semifinal) {
            for (var i = 0; i < 2; i++) {
                playOff.push({
                    category: category.name,
                    group: "semifinal",
                    team1: { id: 200 + i, name: "Полуфиналист1", arrivalTime: "Местная" },
                    team2: { id: 2000 + i, name: "Полуфиналист2", arrivalTime: "Местная" },
                    time: null,
                });
            }
            playOff.push({
                category: category.name,
                group: "final",
                team1: { id: 300, name: "Финалист1", arrivalTime: "Местная" },
                team2: { id: 301, name: "Финалист2", arrivalTime: "Местная" },
                time: null,
            });
            playOff.push({
                category: category.name,
                group: "third_place",
                team1: { id: 400, name: "Лузер1", arrivalTime: "Местная" },
                team2: { id: 401, name: "Лузер2", arrivalTime: "Местная" },
                time: null,
            });
        }
    });
    return { groupStage: groupStage, playOff: playOff };
}
// Вызов функции и вывод результата
var _a = addMatches(tournamentTest_json_1.default), groupStage = _a.groupStage, playOff = _a.playOff;
console.log(groupStage);
console.log(playOff);
