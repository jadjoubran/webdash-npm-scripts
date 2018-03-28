const { exec, spawn } = require("child_process");
const fs = require("fs");
const kill = require('tree-kill');

const processes = {};

const options = { maxBuffer: 1024 * 1000000 };

const startServerScript = (script) => {
  try {
    const commandProcess = spawn('npm', ['run', script]);
    processes[script] = commandProcess
    commandProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    commandProcess.stderr.on('data', (data) => {
      console.log(data.toString());
    });
    
    commandProcess.on('close', (code) => {
      console.log(`script ${script} exited with code ${code}`);
    });
    return Promise.resolve(`script ${script} is running successfully`)
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
        const { serverScripts = [] } = webdashJson
        if (~serverScripts.indexOf(body.script)) {
          startServerScript(body.script)
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
        const body = req.body;
        const { script } = body
        const appRoot = req.app.locals.appRoot;
        const webdashJson = require(`${appRoot}/webdash.json`);
        const { serverScripts = [] } = webdashJson

        if (!body || !script) {
          return res.send(false);
        }

        if (!processes[script]) {
          return res.send(false);
        }

        processes[script].kill();
        res.send(true);
      }
    }
  }
};
