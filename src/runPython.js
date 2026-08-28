import { execFile } from 'child_process';
import path from 'path';

const runPythonScript = (jsonData) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = execFile('python', [path.join(import.meta.dirname, 'create_timetable/main.py')], {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });

    pythonProcess.stdin.write(JSON.stringify(jsonData));
    pythonProcess.stdin.end();

    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Ошибка Python: ${data}`);
      reject(data);
    });

    pythonProcess.on('close', () => {
      try {
        resolve(JSON.parse(result));
      } catch (error) {
        reject(error);
      }
    });
  });
};

export default runPythonScript;
