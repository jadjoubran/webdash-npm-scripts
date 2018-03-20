const exec = require("child_process").exec;
const fs = require("fs");

const processes = {};

const options = { maxBuffer: 1024 * 1000000 };

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
