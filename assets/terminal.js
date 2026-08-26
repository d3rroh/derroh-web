/* ═══════════════════════════════════════════════════════════════
   DERROH-OPS  |  Terminal Simulator
   Client-side DevOps command-line simulation
   All output is fictional — no server interaction.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── DOM ──────────────────────────────────────────────────── */
  const screen = document.getElementById('term-screen');
  const log    = document.getElementById('term-log');
  const input  = document.getElementById('term-input');
  if (!screen || !log || !input) return;

  /* ── STATE ────────────────────────────────────────────────── */
  const state = {
    history: [],
    historyIdx: -1,
    executing: false,
    session: Date.now().toString(36),
  };

  /* ── SIMULATED INFRASTRUCTURE ─────────────────────────────── */
  const NAMESPACES = ['production', 'staging', 'monitoring', 'ingress'];

  const DEPLOYMENTS = [
    { name: 'api-gateway',   ns: 'production', replicas: 3, image: 'derroh/api-gateway:2.4.1',  ports: '8080/TCP' },
    { name: 'web-frontend',  ns: 'production', replicas: 2, image: 'derroh/frontend:1.8.0',     ports: '3000/TCP' },
    { name: 'worker',        ns: 'production', replicas: 2, image: 'derroh/worker:1.3.2',        ports: '9090/TCP' },
    { name: 'cache-proxy',   ns: 'production', replicas: 2, image: 'redis:7.2-alpine',           ports: '6379/TCP' },
    { name: 'nginx-ingress', ns: 'ingress',    replicas: 2, image: 'nginx:1.27-alpine',          ports: '80/443' },
    { name: 'cert-manager',  ns: 'ingress',    replicas: 1, image: 'certmanager/cert-manager:1.14', ports: '9402/TCP' },
    { name: 'prometheus',    ns: 'monitoring',  replicas: 1, image: 'prom/prometheus:2.51',       ports: '9090/TCP' },
    { name: 'grafana',       ns: 'monitoring',  replicas: 1, image: 'grafana/grafana:10.4',       ports: '3000/TCP' },
    { name: 'staging-app',   ns: 'staging',     replicas: 1, image: 'derroh/app:staging-latest',  ports: '8080/TCP' },
  ];

  const SERVICES = [
    { name: 'api-gateway',   ns: 'production', type: 'ClusterIP',  clusterIP: '10.43.0.12', ports: '8080→8080' },
    { name: 'web-frontend',  ns: 'production', type: 'ClusterIP',  clusterIP: '10.43.0.34', ports: '3000→3000' },
    { name: 'worker',        ns: 'production', type: 'ClusterIP',  clusterIP: '10.43.0.56', ports: '9090→9090' },
    { name: 'cache-proxy',   ns: 'production', type: 'ClusterIP',  clusterIP: '10.43.0.78', ports: '6379→6379' },
    { name: 'nginx-ingress', ns: 'ingress',    type: 'LoadBalancer', clusterIP: '10.43.0.1', ports: '80→80, 443→443' },
    { name: 'prometheus',    ns: 'monitoring',  type: 'ClusterIP',  clusterIP: '10.43.0.91', ports: '9090→9090' },
    { name: 'grafana',       ns: 'monitoring',  type: 'ClusterIP',  clusterIP: '10.43.0.92', ports: '3000→3000' },
  ];

  const INGRESS = [
    { host: 'derroh.co.ke',        service: 'web-frontend', port: 3000, tls: 'letsencrypt-prod' },
    { host: 'api.derroh.co.ke',    service: 'api-gateway',  port: 8080, tls: 'letsencrypt-prod' },
    { host: 'grafana.derroh.co.ke', service: 'grafana',     port: 3000, tls: 'letsencrypt-prod' },
  ];

  /* ── Helpers ──────────────────────────────────────────────── */
  function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[rng(0, arr.length - 1)]; }
  function pad(s, n) { return String(s).padEnd(n); }
  function rpad(s, n) { return String(s).padStart(n); }
  function hexId(len) { return Array.from({ length: len }, () => '0123456789abcdef'[rng(0, 15)]).join(''); }
  function hashId() { return hexId(10); }
  function podSuffix() { return hexId(5); }

  function uptimeStr() {
    const h = rng(2, 720);
    const d = Math.floor(h / 24);
    const hr = h % 24;
    const m = rng(0, 59);
    if (d > 0) return `${d}d ${hr}h ${m}m`;
    return `${hr}h ${m}m`;
  }

  function ageStr() {
    const choices = [`${rng(1, 120)}m`, `${rng(1, 48)}h`, `${rng(1, 30)}d`];
    return pick(choices);
  }

  function memStr() { return `${rng(32, 512)}Mi`; }
  function cpuStr() { return `${rng(1, 200)}m`; }
  function restartStr() { return Math.random() < 0.08 ? rng(1, 3) : 0; }

  /* ── Generate pods for a deployment (session-consistent) ──── */
  const podCache = {};
  function getPods(deploy) {
    const key = deploy.name + ':' + state.session;
    if (podCache[key]) return podCache[key];
    const pods = [];
    for (let i = 0; i < deploy.replicas; i++) {
      const generating = Math.random() < 0.06 && i === 0;
      pods.push({
        namespace: deploy.ns,
        name: `${deploy.name}-${hashId()}-${podSuffix()}`,
        ready: generating ? '0/1' : '1/1',
        status: generating ? 'ContainerCreating' : 'Running',
        restarts: restartStr(),
        age: ageStr(),
        cpu: cpuStr(),
        mem: memStr(),
        image: deploy.image,
        node: `worker-${hexId(3)}`,
      });
    }
    podCache[key] = pods;
    return pods;
  }

  function allPods() { return DEPLOYMENTS.flatMap(getPods); }

  function findPod(nameFragment) {
    return allPods().find(p => p.name.includes(nameFragment));
  }

  /* ── Docker containers ────────────────────────────────────── */
  function dockerContainers() {
    const suffix = state.session.slice(-6);
    return [
      { id: hexId(12), image: 'derroh/api-gateway:2.4.1', status: 'Up ' + rng(5, 300) + ' minutes', name: 'api-gateway', ports: '0.0.0.0:8080→8080/tcp' },
      { id: hexId(12), image: 'derroh/frontend:1.8.0', status: 'Up ' + rng(10, 300) + ' minutes', name: 'web-frontend', ports: '0.0.0.0:3000→3000/tcp' },
      { id: hexId(12), image: 'redis:7.2-alpine', status: 'Up ' + rng(15, 300) + ' minutes', name: 'cache-proxy', ports: '0.0.0.0:6379→6379/tcp' },
      { id: hexId(12), image: 'nginx:1.27-alpine', status: 'Up ' + rng(20, 300) + ' minutes', name: 'nginx-ingress', ports: '0.0.0.0:80→80/tcp, 0.0.0.0:443→443/tcp' },
      { id: hexId(12), image: 'prom/prometheus:2.51', status: 'Up ' + rng(30, 300) + ' minutes', name: 'prometheus', ports: '0.0.0.0:9090→9090/tcp' },
      { id: hexId(12), image: 'grafana/grafana:10.4', status: 'Up ' + rng(25, 300) + ' minutes', name: 'grafana', ports: '0.0.0.0:3000→3000/tcp' },
    ];
  }

  /* ── Blocked commands ─────────────────────────────────────── */
  const BLOCKED = [
    'sudo', 'sudo su', 'sudo -i', 'su', 'su -', 'passwd',
    'rm -rf /', 'rm -rf /*', 'rm -rf ~', 'shutdown', 'reboot', 'halt', 'poweroff',
    'mkfs', 'mount', 'umount', 'fdisk', 'parted',
    'cat /etc/shadow', 'cat /etc/passwd', 'cat /etc/sudoers',
    'kubectl get secrets', 'kubectl get secrets -A', 'kubectl config view',
    'kubectl config get-contexts', 'kubectl get sa', 'kubectl get clusterrole',
    'kubectl get clusterrolebinding', 'kubectl get rolebinding',
    'docker exec', 'docker run', 'docker run --privileged', 'docker inspect',
    'docker info', 'docker stats',
    'ssh', 'ssh-keygen', 'scp', 'rsync',
    'curl', 'wget', 'nc', 'netcat', 'ncat', 'socat',
    'python', 'python3', 'perl', 'ruby', 'node', 'php',
    'eval', 'exec', 'source', 'bash', 'sh', 'zsh',
    'chmod 777', 'chown', 'chroot',
    'iptables', 'ip6tables', 'ufw disable',
    'kill -9', 'killall', 'pkill',
    'dd', 'sync',
  ];

  function isBlocked(cmd) {
    const c = cmd.trim().toLowerCase();
    return BLOCKED.some(b => c === b || c.startsWith(b + ' '));
  }

  /* ── Command completions map ──────────────────────────────── */
  const COMPLETIONS = [
    'help', 'clear', 'history', 'whoami', 'hostname', 'uptime',
    'uname', 'df', 'free', 'top', 'date',
    'kubectl get pods', 'kubectl get svc', 'kubectl get services',
    'kubectl get deployments', 'kubectl get namespaces', 'kubectl get ingress',
    'kubectl describe pod',
    'docker ps', 'docker images', 'docker version',
    'systemctl status nginx', 'systemctl status docker', 'systemctl status sshd',
    'ping gateway', 'dig derroh.co.ke',
    'security status', 'firewall status', 'ssl status',
    'audit log', 'incident list', 'health check',
    'projects', 'skills', 'stack', 'contact',
    'neofetch',
  ];

  /* ── Response generators ──────────────────────────────────── */
  function cmdHelp() {
    return [
      '<span class="term-cyan">DERROH-OPS Terminal Simulator</span>',
      '<span class="term-dim">All commands are simulated locally. No production access.</span>',
      '',
      '<span class="term-bold">SYSTEM</span>',
      '  help              Show this help message',
      '  clear             Clear terminal screen',
      '  history           Show command history',
      '  whoami            Current user',
      '  hostname          System hostname',
      '  uptime            System uptime',
      '  uname             System information',
      '  df                Disk usage',
      '  free              Memory usage',
      '  top               Process overview',
      '  date              Current date/time',
      '  neofetch          System info display',
      '',
      '<span class="term-bold">KUBERNETES</span>',
      '  kubectl get pods             List pods',
      '  kubectl get svc             List services',
      '  kubectl get deployments     List deployments',
      '  kubectl get namespaces      List namespaces',
      '  kubectl get ingress         List ingress rules',
      '  kubectl describe pod &lt;name&gt; Describe a pod',
      '',
      '<span class="term-bold">DOCKER</span>',
      '  docker ps             List containers',
      '  docker images         List images',
      '  docker version        Docker version',
      '',
      '<span class="term-bold">SERVICES</span>',
      '  systemctl status nginx    Nginx status',
      '  systemctl status docker   Docker status',
      '  systemctl status sshd     SSH status',
      '',
      '<span class="term-bold">NETWORK</span>',
      '  ping gateway          Ping gateway',
      '  dig derroh.co.ke      DNS lookup',
      '',
      '<span class="term-bold">SECURITY / OPS</span>',
      '  security status       Security overview',
      '  firewall status       Firewall rules',
      '  ssl status            TLS certificate info',
      '  audit log             Recent audit entries',
      '  incident list         Incident tracker',
      '  health check          System health',
      '',
      '<span class="term-bold">PORTFOLIO</span>',
      '  projects              Featured projects',
      '  skills                Skill metrics',
      '  stack                 Tech stack',
      '  contact               Contact info',
    ].join('\n');
  }

  function cmdWhoami() { return 'guest'; }
  function cmdHostname() { return 'derroh-sandbox'; }
  function cmdUptime() {
    return ` 14:32:07 up ${uptimeStr()},  1 user,  load average: 0.${rng(1,30)}, 0.${rng(5,40)}, 0.${rng(10,50)}`;
  }
  function cmdUname() { return 'Linux derroh-sandbox 6.6.31-k3s #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux'; }
  function cmdDate() { return new Date().toString(); }

  function cmdDf() {
    const rows = [
      ['Filesystem', 'Size', 'Used', 'Avail', 'Use%', 'Mounted on'],
      ['/dev/sda1',   '40G',  '18G',  '20G',  '48%',  '/'],
      ['tmpfs',       '2.0G', '12M',  '2.0G', '1%',   '/dev/shm'],
      ['/dev/sdb1',  '100G', '42G',  '53G',  '45%',  '/data'],
    ];
    return rows.map(r => `  ${pad(r[0], 18)} ${rpad(r[1], 6)} ${rpad(r[2], 6)} ${rpad(r[3], 6)} ${rpad(r[4], 5)} ${r[5]}`).join('\n');
  }

  function cmdFree() {
    return [
      '                total        used        free      shared  buff/cache   available',
      'Mem:          8.0Gi       3.2Gi       2.1Gi       256Mi       2.7Gi       4.4Gi',
      'Swap:         2.0Gi          0B       2.0Gi',
    ].join('\n');
  }

  function cmdTop() {
    const procs = [
      ['1', 'root', '0.3', '0.2', '12432', '4096', 'S', 'nginx: master', '0:02.14'],
      ['2', 'root', '1.2', '1.8', '342080', '148480', 'S', 'api-gateway', '0:18.72'],
      ['3', 'root', '0.8', '1.2', '256128', '98304', 'S', 'web-frontend', '0:11.43'],
      ['4', 'root', '0.1', '0.3', '18944', '24576', 'S', 'redis-server', '0:04.21'],
      ['5', 'root', '0.2', '0.4', '42112', '32768', 'S', 'prometheus', '0:06.88'],
      ['6', 'root', '0.1', '0.5', '54272', '40960', 'S', 'grafana-server', '0:03.15'],
    ];
    const header = `top - 14:32:07 up ${uptimeStr()},  1 user,  load avg: 0.${rng(1,30)}, 0.${rng(5,40)}, 0.${rng(10,50)}
Tasks: ${rng(48,62)} total,   1 running, ${rng(44,58)} sleeping,   0 stopped,   0 zombie
%Cpu(s):  ${rng(3,12)}.${rng(0,9)} us,  ${rng(0,3)}.${rng(0,9)} sy,  ${rng(0,1)}.${rng(0,9)} ni, ${rng(80,95)}.${rng(0,9)} id,  ${rng(0,1)}.${rng(0,9)} wa
MiB Mem :   8192.0 total,   2150.4 free,   3276.8 used,   2764.8 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   4505.6 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND`;
    const lines = procs.map(p =>
      `    ${rpad(p[0], 4)} ${pad(p[1], 8)} 20   0 ${rpad(p[4], 8)} ${rpad(p[5], 8)} ${rpad(p[6], 5)} ${p[7]}  ${rpad(p[2], 4)}  ${rpad(p[3], 4)}   ${rpad(p[8], 8)} ${p[9]}`
    );
    return header + '\n' + lines.join('\n');
  }

  function cmdNeofetch() {
    return [
      '<span class="term-cyan">       .--.        </span>  <span class="term-bold">guest</span>@<span class="term-bold">derroh-sandbox</span>',
      '<span class="term-cyan">      |o_o |       </span>  ─────────────────────',
      '<span class="term-cyan">      |:_/ |       </span>  <span class="term-bold">OS:</span> Linux 6.6.31-k3s x86_64',
      '<span class="term-cyan">     //   \\ \\      </span>  <span class="term-bold">Host:</span> DERROH-OPS Sandbox',
      '<span class="term-cyan">    (|     | )     </span>  <span class="term-bold">Kernel:</span> 6.6.31-k3s',
      '<span class="term-cyan">   /\'\\_   _/`\\    </span>  <span class="term-bold">Shell:</span> bash 5.2.21',
      '<span class="term-cyan">   \\___)=(___/    </span>  <span class="term-bold">Terminal:</span> derroh-sim',
      '<span class="term-dim">                   </span>  <span class="term-bold">Memory:</span> 3277MiB / 8192MiB',
    ].join('\n');
  }

  /* ── Kubernetes commands ──────────────────────────────────── */
  function cmdKubectlGet(args) {
    const resource = (args[0] || '').toLowerCase();
    if (resource === 'pods' || resource === 'po') return kubectlGetPods();
    if (resource === 'svc' || resource === 'services' || resource === 'service') return kubectlGetSvc();
    if (resource === 'deployments' || resource === 'deploy') return kubectlGetDeployments();
    if (resource === 'namespaces' || resource === 'ns') return kubectlGetNamespaces();
    if (resource === 'ingress' || resource === 'ing') return kubectlGetIngress();
    if (resource === 'nodes' || resource === 'no') return kubectlBlockedNodes();
    if (resource === 'secrets' || resource === 'sa' || resource === 'configmaps') return kubectlBlockedResource(resource);
    return `error: unknown resource type "${resource || ''}"\n\nSupported: pods, svc, deployments, namespaces, ingress`;
  }

  function kubectlGetPods() {
    const pods = allPods();
    const header = `NAME                                    READY   STATUS             RESTARTS        AGE`;
    const lines = pods.map(p => {
      const statusColored = p.status === 'Running'
        ? `<span class="term-success">${pad(p.status, 18)}</span>`
        : `<span class="term-warning">${pad(p.status, 18)}</span>`;
      return `  ${pad(p.name, 40)} ${pad(p.ready, 6)} ${statusColored}   ${rpad(String(p.restarts), 8)}         ${p.age}`;
    });
    return header + '\n' + lines.join('\n');
  }

  function kubectlGetSvc() {
    const header = `NAME             TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE`;
    const lines = SERVICES.map(s => {
      const extIP = s.type === 'LoadBalancer' ? '<pending>' : '<none>';
      return `  ${pad(s.name, 17)} ${pad(s.type, 14)} ${pad(s.clusterIP, 15)} ${pad(extIP, 12)} ${pad(s.ports, 28)} ${ageStr()}`;
    });
    return header + '\n' + lines.join('\n');
  }

  function kubectlGetDeployments() {
    const header = `NAME             READY   UP-TO-DATE   AVAILABLE   AGE`;
    const lines = DEPLOYMENTS.map(d => {
      const ready = `${d.replicas}/${d.replicas}`;
      return `  ${pad(d.name, 17)} ${pad(ready, 6)} ${rpad(String(d.replicas), 11)} ${rpad(String(d.replicas), 10)}  ${ageStr()}`;
    });
    return header + '\n' + lines.join('\n');
  }

  function kubectlGetNamespaces() {
    const header = `NAME              STATUS   AGE`;
    const lines = NAMESPACES.map(n => `  ${pad(n, 18)} Active   ${ageStr()}`);
    return header + '\n' + lines.join('\n');
  }

  function kubectlGetIngress() {
    const header = `NAME             CLASS   HOSTS                  ADDRESS        PORTS     AGE`;
    const lines = INGRESS.map(i => {
      const addr = `${rng(10,192)}.${rng(0,255)}.${rng(0,255)}.${rng(1,254)}`;
      return `  ${pad('web-ingress', 17)} nginx   ${pad(i.host, 23)} ${pad(addr, 14)} HTTPS     ${ageStr()}`;
    });
    return header + '\n' + lines.join('\n');
  }

  function kubectlBlockedNodes() {
    return [
      '',
      '  <span class="term-warning">┌──────────────────────────────────────────────┐</span>',
      '  <span class="term-warning">│</span>                                              <span class="term-warning">│</span>',
      '  <span class="term-warning">│</span>  <span class="term-danger">⚠ RESTRICTED RESOURCE</span>                   <span class="term-warning">│</span>',
      '  <span class="term-warning">│</span>                                              <span class="term-warning">│</span>',
      '  <span class="term-warning">│</span>  Node topology is intentionally hidden in     <span class="term-warning">│</span>',
      '  <span class="term-warning">│</span>  the public simulation environment.           <span class="term-warning">│</span>',
      '  <span class="term-warning">│</span>                                              <span class="term-warning">│</span>',
      '  <span class="term-warning">└──────────────────────────────────────────────┘</span>',
      '',
    ].join('\n');
  }

  function kubectlBlockedResource(type) {
    return [
      '',
      '  <span class="term-danger">Access denied: "' + type + '" is restricted in the public simulation.</span>',
      '',
    ].join('\n');
  }

  function cmdKubectlDescribe(podFragment) {
    if (!podFragment) return 'error: specify a pod name, e.g. kubectl describe pod <name>';
    const pod = findPod(podFragment);
    if (!pod) return `error: pods "${podFragment}" not found\n\n<span class="term-dim">Tip: run "kubectl get pods" to see available pods.</span>`;
    return [
      `<span class="term-bold">Name:</span>             ${pod.name}`,
      `<span class="term-bold">Namespace:</span>        ${pod.namespace}`,
      `<span class="term-bold">Priority:</span>         0`,
      `<span class="term-bold">Service Account:</span>  default`,
      `<span class="term-bold">Node:</span>             ${pod.node}/10.0.${rng(1,254)}.${rng(1,254)}`,
      `<span class="term-bold">Start Time:</span>       ${new Date(Date.now() - rng(3600000, 86400000 * 30)).toISOString()}`,
      `<span class="term-bold">Labels:</span>           app=${pod.name.split('-').slice(0,-2).join('-') || 'app'}`,
      `                  pod-template-hash=${hashId().slice(0,10)}`,
      `<span class="term-bold">Status:</span>           ${pod.status}`,
      `<span class="term-bold">IP:</span>               10.42.${rng(0,15)}.${rng(1,254)}`,
      `<span class="term-bold">Controlled By:</span>    ReplicaSet/${pod.name.split('-').slice(0,-2).join('-') || 'app'}-${hashId().slice(0,10)}`,
      '',
      '<span class="term-bold">Containers:</span>',
      `  <span class="term-cyan">container:</span>`,
      `    Image:          ${pod.image}`,
      `    Port:           TCP`,
      `    State:          ${pod.status === 'Running' ? '<span class="term-success">Running</span>' : '<span class="term-warning">Waiting</span>'}`,
      `    Ready:          ${pod.ready}`,
      `    Restarts:       ${pod.restarts}`,
      `    Environment:    <span class="term-dim">(simulated)</span>`,
      `    Mounts:         <span class="term-dim">(simulated)</span>`,
      '',
      '<span class="term-bold">Conditions:</span>',
      `  Type              Status`,
      `  Initialized       True`,
      `  Ready             ${pod.status === 'Running' ? 'True' : 'False'}`,
      `  ContainersReady   ${pod.status === 'Running' ? 'True' : 'False'}`,
      `  PodScheduled      True`,
    ].join('\n');
  }

  /* ── Docker commands ──────────────────────────────────────── */
  function cmdDockerPs() {
    const containers = dockerContainers();
    const header = `CONTAINER ID   IMAGE                    STATUS          NAMES`;
    const lines = containers.map(c =>
      `  ${c.id}   ${pad(c.image, 24)} ${pad(c.status, 15)} ${c.name}`
    );
    return header + '\n' + lines.join('\n');
  }

  function cmdDockerImages() {
    const header = `REPOSITORY                  TAG          IMAGE ID       SIZE`;
    const images = [
      ['derroh/api-gateway', '2.4.1', hexId(12), `${rng(80,150)}MB`],
      ['derroh/frontend', '1.8.0', hexId(12), `${rng(60,120)}MB`],
      ['derroh/worker', '1.3.2', hexId(12), `${rng(50,100)}MB`],
      ['redis', '7.2-alpine', hexId(12), `${rng(30,40)}MB`],
      ['nginx', '1.27-alpine', hexId(12), `${rng(30,50)}MB`],
      ['prom/prometheus', '2.51', hexId(12), `${rng(200,300)}MB`],
      ['grafana/grafana', '10.4', hexId(12), `${rng(300,400)}MB`],
      ['certmanager/cert-manager', '1.14', hexId(12), `${rng(60,90)}MB`],
    ];
    const lines = images.map(i => `  ${pad(i[0], 27)} ${pad(i[1], 12)} ${i[2]}   ${i[3]}`);
    return header + '\n' + lines.join('\n');
  }

  function cmdDockerVersion() {
    return [
      'Client:',
      ' Version:           25.0.4',
      ' API version:       1.44',
      ' Go version:        go1.22.1',
      ' Git commit:        b0cdc4dda',
      ' Built:             Wed Mar  6 18:00:00 2025',
      ' OS/Arch:           linux/amd64',
      '',
      'Server:',
      ' Version:           25.0.4',
      ' API version:       1.44 (minimum version 1.24)',
      ' Go version:        go1.22.1',
      ' Git commit:        b0cdc4dda',
      ' Built:             Wed Mar  6 18:00:00 2025',
      ' OS/Arch:           linux/amd64',
    ].join('\n');
  }

  /* ── Systemctl commands ───────────────────────────────────── */
  function cmdSystemctlStatus(service) {
    const services = {
      nginx: {
        name: 'nginx.service',
        desc: 'A high performance web server and reverse proxy server',
        loaded: 'loaded (/lib/systemd/system/nginx.service; enabled)',
        active: '<span class="term-success">active (running)</span>',
        main: `PID ${rng(1000,9999)}`,
        mem: `${rng(8,32)}M`,
        cpu: `${rng(0,2)}%`,
        tasks: `${rng(4,8)}`,
        log: [
          `  ${new Date().toISOString()} derroh-sandbox nginx[${rng(1000,9999)}]: nginx: configuration file /etc/nginx/nginx.conf test is successful`,
          `  ${new Date().toISOString()} derroh-sandbox systemd[1]: Started A high performance web server and reverse proxy server.`,
          `  ${new Date().toISOString()} derroh-sandbox nginx[${rng(1000,9999)}]: Accepted client connection from 10.42.${rng(0,15)}.${rng(1,254)}`,
        ],
      },
      docker: {
        name: 'docker.service',
        desc: 'Docker Application Container Engine',
        loaded: 'loaded (/lib/systemd/system/docker.service; enabled)',
        active: '<span class="term-success">active (running)</span>',
        main: `PID ${rng(1000,9999)}`,
        mem: `${rng(60,120)}M`,
        cpu: `${rng(1,5)}%`,
        tasks: `${rng(12,24)}`,
        log: [
          `  ${new Date().toISOString()} derroh-sandbox dockerd[${rng(1000,9999)}]: API listen on /var/run/docker.sock`,
          `  ${new Date().toISOString()} derroh-sandbox dockerd[${rng(1000,9999)}]: Healthcheck started`,
          `  ${new Date().toISOString()} derroh-sandbox containerd[${rng(1000,9999)}]: starting containerd`,
        ],
      },
      sshd: {
        name: 'sshd.service',
        desc: 'OpenBSD Secure Shell server',
        loaded: 'loaded (/lib/systemd/system/sshd.service; enabled)',
        active: '<span class="term-success">active (running)</span>',
        main: `PID ${rng(1000,9999)}`,
        mem: `${rng(4,8)}M`,
        cpu: `${rng(0,1)}%`,
        tasks: `${rng(1,3)}`,
        log: [
          `  ${new Date().toISOString()} derroh-sandbox sshd[${rng(1000,9999)}]: Server listening on 0.0.0.0 port 22.`,
          `  ${new Date().toISOString()} derroh-sandbox sshd[${rng(1000,9999)}]: Received disconnect from 10.42.${rng(0,15)}.${rng(1,254)}: disconnected by user`,
        ],
      },
    };
    const s = services[service];
    if (!s) return `Unit ${service}.service could not be found.`;
    return [
      `○ ${s.name} - ${s.desc}`,
      `     Loaded: ${s.loaded}`,
      `     Active: ${s.active}`,
      `       Main: ${s.main}`,
      `        CPU: ${s.cpu}`,
      `     Memory: ${s.mem}`,
      `        Tasks: ${s.tasks} (limit: ${rng(512,2048)})`,
      ``,
      `<span class="term-dim">Aug 26 14:32:01 derroh-sandbox systemd[1]: Started ${s.desc}.</span>`,
      ...s.log.map(l => `<span class="term-dim">${l}</span>`),
    ].join('\n');
  }

  /* ── Network commands ─────────────────────────────────────── */
  function cmdPing() {
    return [
      `PING gateway (10.43.0.1) 56(84) bytes of data.`,
      `64 bytes from 10.43.0.1: icmp_seq=1 ttl=64 time=${(Math.random() * 2 + 0.1).toFixed(1)} ms`,
      `64 bytes from 10.43.0.1: icmp_seq=2 ttl=64 time=${(Math.random() * 2 + 0.1).toFixed(1)} ms`,
      `64 bytes from 10.43.0.1: icmp_seq=3 ttl=64 time=${(Math.random() * 2 + 0.1).toFixed(1)} ms`,
      '',
      `--- gateway ping statistics ---`,
      `3 packets transmitted, 3 received, 0% packet loss, time 2003ms`,
      `rtt min/avg/max/mdev = ${(Math.random() * 0.5 + 0.1).toFixed(3)}/${(Math.random() * 1 + 0.2).toFixed(3)}/${(Math.random() * 2 + 0.5).toFixed(3)}/${(Math.random() * 0.5 + 0.1).toFixed(3)} ms`,
    ].join('\n');
  }

  function cmdDig() {
    const ip = `${rng(10,192)}.${rng(0,255)}.${rng(0,255)}.${rng(1,254)}`;
    return [
      `; <<>> DiG 9.18.24-0ubuntu0.22.04.1-Ubuntu <<>> derroh.co.ke`,
      `;; global options: +cmd`,
      `;; Got answer:`,
      `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: ${rng(10000,65000)}`,
      `;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1`,
      ``,
      `;; QUESTION SECTION:`,
      `;derroh.co.ke.                  IN      A`,
      ``,
      `;; ANSWER SECTION:`,
      `derroh.co.ke.           ${rng(30,300)}   IN      A       ${ip}`,
      ``,
      `;; Query time: ${rng(5,30)} msec`,
      `;; SERVER: 1.1.1.1#53(1.1.1.1)`,
    ].join('\n');
  }

  /* ── Security / Ops commands ──────────────────────────────── */
  function cmdSecurityStatus() {
    return [
      '<span class="term-bold">SECURITY STATUS</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      `  Sandbox             <span class="term-success">ONLINE</span>`,
      `  Host Access         <span class="term-danger">BLOCKED</span>`,
      `  Root Access         <span class="term-danger">BLOCKED</span>`,
      `  Production Access   <span class="term-danger">BLOCKED</span>`,
      `  Network Access      <span class="term-warning">RESTRICTED</span>`,
      `  Secrets             <span class="term-danger">ISOLATED</span>`,
      `  Command Execution   <span class="term-info">SIMULATED</span>`,
      '',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '  Security posture:   <span class="term-success">NOMINAL</span>',
    ].join('\n');
  }

  function cmdFirewallStatus() {
    return [
      '<span class="term-bold">FIREWALL STATUS</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      `  Status:              <span class="term-success">active</span>`,
      `  Default policy:      DROP (incoming), ACCEPT (outgoing)`,
      '',
      '<span class="term-bold">  Active rules:</span>',
      `    22/tcp    ALLOW    10.0.0.0/8        SSH (management)`,
      `    80/tcp    ALLOW    anywhere          HTTP`,
      `    443/tcp   ALLOW    anywhere          HTTPS`,
      `    6443/tcp  ALLOW    10.0.0.0/8        Kubernetes API`,
      ``,
      `  Dropped:             ${rng(1200,4800)} packets (last 24h)`,
      `  Blocked IPs:         ${rng(12,48)} (auto-banned)`,
    ].join('\n');
  }

  function cmdSslStatus() {
    return [
      '<span class="term-bold">SSL / TLS STATUS</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      `  Certificate:         <span class="term-success">VALID</span>`,
      `  Issuer:              Let\'s Encrypt (R3)`,
      `  Domain:              derroh.co.ke`,
      `  SANs:                derroh.co.ke, *.derroh.co.ke`,
      `  Expires:             ${new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]}`,
      `  Auto-renew:          <span class="term-success">enabled</span>`,
      `  Protocol:            TLSv1.3`,
      `  Key Exchange:        X25519`,
      `  Cipher:              TLS_AES_256_GCM_SHA384`,
    ].join('\n');
  }

  function cmdAuditLog() {
    const entries = [
      { time: '14:31:42', user: 'guest', action: 'login', result: '<span class="term-success">OK</span>', detail: 'session started' },
      { time: '14:31:45', user: 'guest', action: 'cmd', result: '<span class="term-info">SIM</span>', detail: 'help' },
      { time: '14:31:58', user: 'guest', action: 'cmd', result: '<span class="term-info">SIM</span>', detail: 'kubectl get pods' },
      { time: '14:32:01', user: 'guest', action: 'cmd', result: '<span class="term-info">SIM</span>', detail: 'docker ps' },
      { time: '14:32:15', user: 'guest', action: 'cmd', result: '<span class="term-danger">DENY</span>', detail: 'sudo su (blocked)' },
      { time: '14:32:22', user: 'guest', action: 'cmd', result: '<span class="term-info">SIM</span>', detail: 'security status' },
    ];
    const header = `<span class="term-bold">AUDIT LOG</span>  <span class="term-dim">── session ${state.session}</span>`;
    const rows = entries.map(e =>
      `  <span class="term-dim">${e.time}</span>  ${pad(e.user, 8)}  ${pad(e.action, 6)}  ${e.result.padEnd(28)}  ${e.detail}`
    );
    return header + '\n' + '<span class="term-dim">────────────────────────────────────────────────────────</span>\n' + rows.join('\n');
  }

  function cmdIncidentList() {
    return [
      '<span class="term-bold">INCIDENT TRACKER</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      '  <span class="term-danger">CRITICAL</span>  INC-2026-001  cPanel RCE Malware Attack & Multi-Server Breach',
      '  <span class="term-warning">HIGH</span>      INC-2025-002  WordPress OPcache Webshell Remediation',
      '  <span class="term-danger">CRITICAL</span>  INC-2025-003  CentOS Cryptominer Eradication',
      '  <span class="term-danger">CRITICAL</span>  INC-2025-004  Active SSH Compromise & Backdoor Removal',
      '  <span class="term-info">PROJECT</span>   PRJ-2024-005  ownCloud + MinIO Self-Hosted Stack',
      '  <span class="term-info">PROJECT</span>   PRJ-2025-006  Zero-Loss IMAP Migration',
      '  <span class="term-info">PROJECT</span>   PRJ-2025-007  AlmaLinux Gateway Recovery',
      '  <span class="term-info">PROJECT</span>   PRJ-2025-008  Node.js App Deployment',
      '',
      '  <span class="term-dim">Full case studies: <a href="#cases">derroh.co.ke/#cases</a></span>',
    ].join('\n');
  }

  function cmdHealthCheck() {
    const checks = [
      ['API Gateway',     'healthy', `${rng(1,50)}ms`],
      ['Web Frontend',    'healthy', `${rng(1,30)}ms`],
      ['Cache (Redis)',   'healthy', `${rng(1,5)}ms`],
      ['Nginx Ingress',   'healthy', `${rng(1,20)}ms`],
      ['Prometheus',      'healthy', `${rng(5,50)}ms`],
      ['Grafana',         'healthy', `${rng(5,40)}ms`],
      ['TLS Certificate', 'valid',   '-'],
      ['DNS',             'resolved', `${rng(5,30)}ms`],
    ];
    return [
      '<span class="term-bold">HEALTH CHECK</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      ...checks.map(c => {
        const statusColor = c[1] === 'healthy' || c[1] === 'valid' || c[1] === 'resolved'
          ? '<span class="term-success">✓</span>' : '<span class="term-danger">✗</span>';
        return `  ${statusColor}  ${pad(c[0], 22)} ${pad(c[1], 12)} ${c[2]}`;
      }),
      '',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '  Overall: <span class="term-success">ALL SYSTEMS OPERATIONAL</span>',
    ].join('\n');
  }

  /* ── Portfolio commands ───────────────────────────────────── */
  function cmdProjects() {
    return [
      '<span class="term-bold">FEATURED PROJECTS</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      '  <span class="term-cyan">1.</span> Kubernetes Cluster Migration (Docker Compose → k3s)',
      '  <span class="term-cyan">2.</span> cPanel RCE Incident Response & Remediation',
      '  <span class="term-cyan">3.</span> Zero-Downtime IMAP Migration (Zoho → cPanel)',
      '  <span class="term-cyan">4.</span> WordPress OPcache Webshell Detection & Removal',
      '  <span class="term-cyan">5.</span> ownCloud + MinIO Self-Hosted Cloud Stack',
      '  <span class="term-cyan">6.</span> Automated CI/CD Pipeline (GitHub Actions → k3s)',
      '  <span class="term-cyan">7.</span> CentOS Cryptominer Eradication & Server Hardening',
      '  <span class="term-cyan">8.</span> AlmaLinux VPS Gateway Recovery',
      '',
      '  <span class="term-dim">Details: <a href="#cases">derroh.co.ke/#cases</a></span>',
    ].join('\n');
  }

  function cmdSkills() {
    return [
      '<span class="term-bold">SKILL METRICS</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      '  <span class="term-bold">Containers</span>     ████████████████████  95%',
      '  Kubernetes      ████████████████████  92%',
      '  Linux Admin     ████████████████████  98%',
      '  Docker          ███████████████████░  90%',
      '  CI/CD           ███████████████████░  88%',
      '  Networking      ██████████████████░░  85%',
      '  Security        ███████████████████░  91%',
      '  Nginx           ███████████████████░  89%',
      '  Bash/Scripting  ████████████████████  96%',
      '  Monitoring      █████████████████░░░  82%',
      '',
      '  <span class="term-dim">Interactive view: <a href="#skills">derroh.co.ke/#skills</a></span>',
    ].join('\n');
  }

  function cmdStack() {
    return [
      '<span class="term-bold">TECH STACK</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      '  <span class="term-bold">Orchestration:</span>  k3s (lightweight Kubernetes)',
      '  <span class="term-bold">Containers:</span>     Docker, containerd',
      '  <span class="term-bold">Web Server:</span>     Nginx (ingress controller)',
      '  <span class="term-bold">CI/CD:</span>          GitHub Actions → Docker Hub → kubectl',
      '  <span class="term-bold">Monitoring:</span>     Prometheus, Grafana',
      '  <span class="term-bold">DNS/CDN:</span>        Cloudflare',
      '  <span class="term-bold">Backend:</span>        Go (contact API), Node.js',
      '  <span class="term-bold">Database:</span>       PostgreSQL, Redis',
      '  <span class="term-bold">OS:</span>             AlmaLinux, Ubuntu, Alpine',
      '  <span class="term-bold">Frontend:</span>       Vanilla HTML/CSS/JS (no frameworks)',
    ].join('\n');
  }

  function cmdContact() {
    return [
      '<span class="term-bold">CONTACT</span>',
      '<span class="term-dim">────────────────────────────────────────</span>',
      '',
      '  <span class="term-bold">Name:</span>     Derrick Abila',
      '  <span class="term-bold">Role:</span>     DevOps Engineer & Linux Sysadmin',
      '  <span class="term-bold">Location:</span> Nairobi, Kenya',
      '  <span class="term-bold">Web:</span>      <a href="https://derroh.co.ke">derroh.co.ke</a>',
      '  <span class="term-bold">Email:</span>    <a href="mailto:derrick@derroh.co.ke">derrick@derroh.co.ke</a>',
      '',
      '  <span class="term-dim">Contact form: <a href="#contact">derroh.co.ke/#contact</a></span>',
    ].join('\n');
  }

  /* ── Blocked command responses ────────────────────────────── */
  const BLOCKED_RESPONSES = {
    'default': [
      '',
      '  <span class="term-blocked-box">╭──────────────────────────────────────────────╮',
      '│                                              │',
      '│           ⚠  ACCESS RESTRICTED               │',
      '│                                              │',
      '│  This command is disabled in the public      │',
      '│  simulation environment.                     │',
      '│                                              │',
      '│  The real infrastructure is isolated from    │',
      '│  this terminal.                              │',
      '│                                              │',
      '╰──────────────────────────────────────────────╯</span>',
      '',
    ].join('\n'),
    'sudo su': [
      '',
      '  <span class="term-blocked-box">╭──────────────────────────────────────────────╮',
      '│                                              │',
      '│           ⚠  OOPS... NOT HERE.               │',
      '│                                              │',
      '│  Privileged access is disabled in the        │',
      '│  public simulation.                          │',
      '│                                              │',
      '│  Nice try though.                            │',
      '│                                              │',
      '╰──────────────────────────────────────────────╯</span>',
      '',
    ].join('\n'),
    'rm -rf /': [
      '',
      '  <span class="term-blocked-box">╭──────────────────────────────────────────────╮',
      '│                                              │',
      '│           🛡  NICE TRY.                       │',
      '│                                              │',
      '│  This is a simulation. Nothing to delete.    │',
      '│  The real servers are safe and sound.        │',
      '│                                              │',
      '╰──────────────────────────────────────────────╯</span>',
      '',
    ].join('\n'),
    'shutdown': [
      '',
      '  <span class="term-blocked-box">╭──────────────────────────────────────────────╮',
      '│                                              │',
      '│           ⚠  NOPE.                           │',
      '│                                              │',
      '│  You can\'t shut down a simulation.           │',
      '│  The site will keep running.                 │',
      '│                                              │',
      '╰──────────────────────────────────────────────╯</span>',
      '',
    ].join('\n'),
  };

  function getBlockedResponse(cmd) {
    if (BLOCKED_RESPONSES[cmd]) return BLOCKED_RESPONSES[cmd];
    if (cmd.startsWith('sudo')) return BLOCKED_RESPONSES['sudo su'];
    if (cmd.startsWith('rm ')) return BLOCKED_RESPONSES['rm -rf /'];
    if (cmd.startsWith('shutdown') || cmd.startsWith('reboot') || cmd.startsWith('halt') || cmd.startsWith('poweroff')) return BLOCKED_RESPONSES['shutdown'];
    if (cmd.startsWith('kubectl get secrets') || cmd.startsWith('kubectl get sa') || cmd.startsWith('kubectl config')) return kubectlBlockedNodes();
    if (cmd.startsWith('docker exec') || cmd.startsWith('docker run')) return kubectlBlockedResource('docker ' + cmd.split(' ')[1]);
    if (cmd.startsWith('ssh') || cmd.startsWith('scp') || cmd.startsWith('rsync')) return getBlockedResponse('default');
    if (cmd.startsWith('curl') || cmd.startsWith('wget') || cmd.startsWith('nc ') || cmd.startsWith('netcat')) return getBlockedResponse('default');
    if (cmd.startsWith('python') || cmd.startsWith('perl') || cmd.startsWith('ruby') || cmd.startsWith('node ') || cmd.startsWith('php')) return getBlockedResponse('default');
    if (cmd.startsWith('eval') || cmd.startsWith('exec(') || cmd.startsWith('source ') || cmd.startsWith('bash') || cmd.startsWith('sh ') || cmd.startsWith('zsh')) return getBlockedResponse('default');
    return BLOCKED_RESPONSES['default'];
  }

  /* ── MAIN COMMAND ROUTER ──────────────────────────────────── */
  function executeCommand(raw) {
    const cmd = raw.trim();
    if (!cmd) return null;

    if (isBlocked(cmd)) return getBlockedResponse(cmd);

    const parts = cmd.split(/\s+/);
    const base = parts[0].toLowerCase();

    /* ── System commands ──────────────────────────────────── */
    if (base === 'help')    return cmdHelp();
    if (base === 'clear')   return '__CLEAR__';
    if (base === 'whoami')  return cmdWhoami();
    if (base === 'hostname') return cmdHostname();
    if (base === 'uptime')  return cmdUptime();
    if (base === 'uname')   return cmdUname();
    if (base === 'date')    return cmdDate();
    if (base === 'df')      return cmdDf();
    if (base === 'free')    return cmdFree();
    if (base === 'top')     return cmdTop();
    if (base === 'neofetch') return cmdNeofetch();

    /* ── History command ──────────────────────────────────── */
    if (base === 'history') {
      if (state.history.length === 0) return '  <span class="term-dim">(no commands in history)</span>';
      return state.history.map((h, i) => `  ${rpad(String(i + 1), 4)}  ${h}`).join('\n');
    }

    /* ── Kubernetes commands ──────────────────────────────── */
    if (base === 'kubectl') {
      if (parts.length < 2) return 'kubectl: usage: kubectl <command> <resource> [args]';
      const sub = parts[1].toLowerCase();
      if (sub === 'get') {
        if (parts.length < 3) return 'kubectl get: usage: kubectl get <resource> [name]';
        if (parts[2].toLowerCase() === 'pods' || parts[2].toLowerCase() === 'po') return cmdKubectlGetPods();
        return cmdKubectlGet(parts.slice(2));
      }
      if (sub === 'describe') {
        if (parts.length < 4) return 'kubectl describe: usage: kubectl describe pod <name>';
        if (parts[2].toLowerCase() !== 'pod') return `kubectl describe: unsupported resource "${parts[2]}"`;
        return cmdKubectlDescribe(parts[3]);
      }
      return `kubectl: unknown subcommand "${sub}"\n\n<span class="term-dim">Supported: get, describe</span>`;
    }

    /* ── Docker commands ──────────────────────────────────── */
    if (base === 'docker') {
      if (parts.length < 2) return 'docker: usage: docker <command>';
      const sub = parts[1].toLowerCase();
      if (sub === 'ps') return cmdDockerPs();
      if (sub === 'images') return cmdDockerImages();
      if (sub === 'version') return cmdDockerVersion();
      return `docker: unknown subcommand "${sub}"\n\n<span class="term-dim">Supported: ps, images, version</span>`;
    }

    /* ── Systemctl commands ───────────────────────────────── */
    if (base === 'systemctl') {
      if (parts.length < 3) return 'systemctl: usage: systemctl status <service>';
      const sub = parts[1].toLowerCase();
      const service = parts[2].toLowerCase().replace('.service', '');
      if (sub === 'status') return cmdSystemctlStatus(service);
      return `systemctl: unknown subcommand "${sub}"\n\n<span class="term-dim">Supported: status</span>`;
    }

    /* ── Network commands ─────────────────────────────────── */
    if (base === 'ping') return cmdPing();
    if (base === 'dig')  return cmdDig();

    /* ── Security / Ops commands ──────────────────────────── */
    if (base === 'security' && parts[1] && parts[1].toLowerCase() === 'status') return cmdSecurityStatus();
    if (base === 'firewall' && parts[1] && parts[1].toLowerCase() === 'status') return cmdFirewallStatus();
    if (base === 'ssl' && parts[1] && parts[1].toLowerCase() === 'status') return cmdSslStatus();
    if (base === 'audit' && parts[1] && parts[1].toLowerCase() === 'log') return cmdAuditLog();
    if (base === 'incident' && parts[1] && parts[1].toLowerCase() === 'list') return cmdIncidentList();
    if (base === 'health' && parts[1] && parts[1].toLowerCase() === 'check') return cmdHealthCheck();

    /* ── Portfolio commands ───────────────────────────────── */
    if (base === 'projects') return cmdProjects();
    if (base === 'skills') return cmdSkills();
    if (base === 'stack') return cmdStack();
    if (base === 'contact') return cmdContact();

    /* ── Unknown command ──────────────────────────────────── */
    if (cmd.startsWith('kubectl get nodes') || cmd.startsWith('kubectl get no')) return kubectlBlockedNodes();
    return `bash: ${base}: command not found\n\n<span class="term-dim">Type \`help\` to see available commands.</span>`;
  }

  /* ── OUTPUT RENDERING ─────────────────────────────────────── */
  function scrollToBottom() {
    screen.scrollTop = screen.scrollHeight;
  }

  function appendOutput(html) {
    const pre = document.createElement('div');
    pre.className = 'term-pre';
    pre.innerHTML = html;
    log.appendChild(pre);
    scrollToBottom();
  }

  function appendPromptLine(cmdText) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = `<span class="term-prompt-inline">guest@derroh-ops:~$</span> <span class="term-cmd-text">${escapeHtml(cmdText)}</span>`;
    log.appendChild(line);
  }

  function appendWelcome() {
    const welcome = document.createElement('div');
    welcome.className = 'term-welcome';
    welcome.innerHTML = [
      'Connected to <span class="term-cyan">DERROH-OPS</span> simulation.',
      '',
      'Commands are simulated locally.',
      'No commands are executed on production infrastructure.',
      '',
      'Type <span class="term-cyan">`help`</span> to see available commands.',
      '',
    ].join('\n');
    log.appendChild(welcome);
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── COMMAND EXECUTION ────────────────────────────────────── */
  function runCommand(cmdText) {
    if (state.executing) return;
    state.executing = true;
    input.disabled = true;

    /* Record in history */
    if (cmdText.trim()) {
      state.history.push(cmdText.trim());
    }
    state.historyIdx = -1;

    /* Show the prompt + command */
    appendPromptLine(cmdText);

    /* Execute */
    const result = executeCommand(cmdText);

    if (result === '__CLEAR__') {
      log.innerHTML = '';
    } else if (result) {
      /* Short delay for realism */
      const delay = rng(30, 120);
      setTimeout(() => {
        appendOutput(result);
        state.executing = false;
        input.disabled = false;
        input.focus();
      }, delay);
    } else {
      state.executing = false;
      input.disabled = false;
      input.focus();
    }
  }

  /* ── TAB COMPLETION ───────────────────────────────────────── */
  function getCompletions(partial) {
    const lower = partial.toLowerCase();
    return COMPLETIONS.filter(c => c.toLowerCase().startsWith(lower) && c.toLowerCase() !== lower);
  }

  function tabComplete() {
    const val = input.value;
    if (!val) return;
    const matches = getCompletions(val);
    if (matches.length === 1) {
      input.value = matches[0];
    } else if (matches.length > 1) {
      appendPromptLine(val);
      const acDiv = document.createElement('div');
      acDiv.className = 'term-autocomplete';
      acDiv.innerHTML = matches.map(m => `<span class="term-ac-item">${escapeHtml(m)}</span>`).join('');
      log.appendChild(acDiv);
      scrollToBottom();
    }
  }

  /* ── KEYBOARD HANDLING ────────────────────────────────────── */
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value;
      input.value = '';
      runCommand(val);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.history.length === 0) return;
      if (state.historyIdx === -1) {
        state.historyIdx = state.history.length - 1;
      } else if (state.historyIdx > 0) {
        state.historyIdx--;
      }
      input.value = state.history[state.historyIdx] || '';
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.historyIdx === -1) return;
      if (state.historyIdx < state.history.length - 1) {
        state.historyIdx++;
        input.value = state.history[state.historyIdx] || '';
      } else {
        state.historyIdx = -1;
        input.value = '';
      }
      return;
    }

    /* Ctrl+L = clear */
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      log.innerHTML = '';
      return;
    }
  });

  /* ── QUICK COMMAND BUTTONS ────────────────────────────────── */
  document.querySelectorAll('.term-chip[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      input.value = cmd;
      input.focus();
      runCommand(cmd);
    });
  });

  /* ── CLICK SCREEN TO FOCUS INPUT ──────────────────────────── */
  screen.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT') {
      input.focus();
    }
  });

  /* ── MOBILE: Prevent page jump on input focus ─────────────── */
  input.addEventListener('focus', () => {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      setTimeout(() => {
        screen.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  });

  /* ── INITIALIZATION ───────────────────────────────────────── */
  function initTerminal() {
    appendWelcome();
    input.focus();
  }

  /* Wait for DOM to be ready, then init when section is visible */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTerminal);
  } else {
    initTerminal();
  }

  /* Also re-focus when the terminal section scrolls into view */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        input.focus();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(screen);

})();
