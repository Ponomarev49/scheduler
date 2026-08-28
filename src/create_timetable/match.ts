type Team = {
  id: number;
  name: string;
  arrivalTime: string;
};

type Match = {
  category: string;
  group: string;
  team1: Team;
  team2: Team;
  time: Date | null;
};

import tournament from "./tournamentTest.json"; // Убедись, что JSON файл доступен



// Вызов функции и вывод результата
const { groupStage, playOff } = addMatches(tournament);
console.log(groupStage);
console.log(playOff);
