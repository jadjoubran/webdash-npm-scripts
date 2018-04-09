const { exec, spawn } = require('child_process')
const fs = require('fs')
const kill = require('tree-kill')

const processes = {}

const options = { maxBuffer: 1024 * 1000000 }

const startServerScript = (script) => {
  try {
    const commandProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', script, '--silent'])
    processes[script] = commandProcess
    commandProcess.stdout.on('data', (data) => {
      console.log(data.toString())
    })

    commandProcess.stderr.on('data', (data) => {
      console.log(data.toString())
    })

    commandProcess.on('close', (code) => {
      console.log(`script ${script} exited with code ${code}`)
    })
    return Promise.resolve(`script ${script} is running successfully`)
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = {
  routes: {
    get: {
      scripts: (req, res) => {
        const appRoot = req.app.locals.appRoot
        let scripts = {}

        if (!fs.existsSync(`${appRoot}/package.json`)) {
          return res.send({ scripts })
        }
        const packageJson = require(`${appRoot}/package.json`)

        res.send({ scripts: packageJson.scripts })
      }
    },
    post: {
      run: (req, res) => {
        const body = req.body
        if (!body || !body.script) {
          return res.send(false)
        }

        const { appRoot, config } = req.app.locals
        const { serverScripts = [] } = config
        if (~serverScripts.indexOf(body.script)) {
          startServerScript(body.script)
            .then((result) => {
              res.send({ response: result, serverStarted: true })
            })
            .catch((error) => {
              return res.status(400).send({ error: error.toString() })
            })
          return
        }
        processes[body.script] = exec(
          `npm run ${body.script} --silent`,
          options,
          (error, response) => {
            if (error !== null) {
              return res.status(400).send({ error: error.toString() })
            }
            res.send({ response: response, serverStarted: false })
          }
        )
      },
      stop: (req, res) => {
        const body = req.body
        const { script } = body

        if (!body || !script) {
          return res.send(false)
        }

        if (!processes[script]) {
          return res.send(false)
        }

        kill(processes[script].pid)
        res.send(true)
      }
    }
  }
}
