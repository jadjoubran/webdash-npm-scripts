const { exec, spawn } = require("child_process");
const fs = require("fs");

const processes = {};

const options = { maxBuffer: 1024 * 1000000 };

let longRuningProcesses = {};

const startLongRuningProcess = (script) => {
  try {
    const commandProcess = spawn('npm', ['run', script]);
    longRuningProcesses[script] = commandProcess
    commandProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    commandProcess.stderr.on('data', (data) => {
      console.log(`std error data: ${data}`);
    });
    
    commandProcess.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
    return Promise.resolve('async process started successfully')
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = {
  routes: {
    get: {
      scripts: (req, res) => {
        const appRoot = req.app.locals.appRoot;
        let scripts = {};

        if (!fs.existsSync(`${appRoot}/package.json`)) {
          return res.send({ scripts });
        }
        const package = require(`${appRoot}/package.json`);

        res.send({ scripts: package.scripts });
      }
    },
    post: {
      run: (req, res) => {
        const body = req.body;
        if (!body || !body.script) {
          return res.send(false);
        }
        const appRoot = req.app.locals.appRoot;
        const webdashJson = require(`${appRoot}/webdash.json`);
        const { longRunningScripts = [] } = webdashJson
        if (~longRunningScripts.indexOf(body.script)) {
          startLongRuningProcess(body.script)
          .then((result) => {
            res.send({ response: result });
          })
          .catch((error) => {
            return res.status(400).send({ error: error.toString() });
          })
          return;
        }
        processes[body.script] = exec(
          `npm run ${body.script} --silent`,
          options,
          (error, response) => {
            if (error !== null) {
              return res.status(400).send({ error: error.toString() });
            }
            res.send({ response: response });
          }
        );
      },
      stop: (req, res) => {
        const appRoot = req.app.locals.appRoot;
        const webdashJson = require(`${appRoot}/webdash.json`);
        if (~longRunningScripts.indexOf(body.script)) {
          longRuningProcesses[script].kill();
          return res.send(true);
        }
        const body = req.body;
        if (!body || !body.script) {
          return res.send(false);
        }
        if (!processes[body.script]) {
          return res.send(false);
        }
        processes[body.script].kill();
        res.send(true);
      }
    }
  }
};
