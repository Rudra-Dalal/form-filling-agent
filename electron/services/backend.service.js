const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

class BackendService {
  constructor() {
    this.backendProcess = null;
    this.baseUrl = 'http://127.0.0.1:8000';
    this.wsUrl = 'ws://127.0.0.1:8000';
  }

  /**
   * Checks if the FastAPI backend is already running on the target port.
   */
  async checkHealth() {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/health`, { timeout: 1000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.status === 'ok');
          } catch {
            resolve(false);
          }
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Starts the FastAPI backend process if not already running.
   */
  async start() {
    const isRunning = await this.checkHealth();
    if (isRunning) {
      console.log('FastAPI backend is already active on', this.baseUrl);
      return;
    }

    const projectRoot = path.resolve(__dirname, '..', '..');
    const venvPythonWin = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
    const venvPythonUnix = path.join(projectRoot, '.venv', 'bin', 'python');

    let pythonExe = process.env.PYTHON_PATH;
    if (!pythonExe) {
      const fs = require('fs');
      if (fs.existsSync(venvPythonWin)) {
        pythonExe = venvPythonWin;
      } else if (fs.existsSync(venvPythonUnix)) {
        pythonExe = venvPythonUnix;
      } else {
        pythonExe = 'python';
      }
    }

    console.log(`Starting FastAPI backend using: ${pythonExe}...`);

    this.backendProcess = spawn(
      pythonExe,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      {
        cwd: path.join(projectRoot, 'backend'),
        env: { ...process.env, PYTHONPATH: path.join(projectRoot, 'backend') },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    this.backendProcess.stdout.on('data', (data) => {
      console.log(`[BACKEND] ${data.toString().trim()}`);
    });

    this.backendProcess.stderr.on('data', (data) => {
      console.error(`[BACKEND ERR] ${data.toString().trim()}`);
    });

    this.backendProcess.on('exit', (code) => {
      console.log(`[BACKEND] Process exited with code ${code}`);
      this.backendProcess = null;
    });

    // Poll until /health responds or timeout after 15 seconds
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await this.checkHealth()) {
        console.log('FastAPI backend is ready and responding on', this.baseUrl);
        return;
      }
    }

    console.warn('FastAPI backend health check timed out. Proceeding...');
  }

  stop() {
    if (this.backendProcess) {
      console.log('Stopping FastAPI backend process...');
      this.backendProcess.kill();
      this.backendProcess = null;
    }
  }
}

const backendService = new BackendService();
module.exports = { backendService };
