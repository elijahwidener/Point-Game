import React, {useEffect, useRef, useState} from 'react';

const API_BASE_URL =
    'https://52keqe3is0.execute-api.us-east-1.amazonaws.com/prod';
const WS_URL = 'wss://xejlkvd34m.execute-api.us-east-1.amazonaws.com/prod';

const API_COMMANDS = {
  // Auth
  'auth.signup': {
    method: 'POST',
    endpoint: '/auth/signup',
    args: ['username', 'password'],
    body: (args) => ({username: args[0], password: args[1]})
  },
  'auth.login': {
    method: 'POST',
    endpoint: '/auth/login',
    args: ['username', 'password'],
    body: (args) => ({username: args[0], password: args[1]})
  },
  'me.get': {
    method: 'GET',
    endpoint: '/me',
    args: ['userID'],
    query: (args) => ({userID: args[0]})
  },

  // Tables
  'tables.create': {
    method: 'POST',
    endpoint: '/tables',
    args: ['userID', 'ante', 'smallBlind', 'bigBlind'],
    body: (args) => ({
      userID: args[0],
      config: {
        ante: parseInt(args[1]),
        smallBlind: parseInt(args[2]),
        bigBlind: parseInt(args[3])
      }
    })
  },
  'tables.list': {method: 'GET', endpoint: '/tables', args: []},
  'tables.get': {
    method: 'GET',
    endpoint: '/tables',
    args: ['tableID'],
    path: (args) => `/tables/${args[0]}`
  },
  'tables.connect': {
    method: 'POST',
    endpoint: '/tables/connect',
    args: ['tableID', 'userID'],
    path: (args) => `/tables/${args[0]}/connect`,
    body: (args) => ({userID: args[1]})
  },
  'tables.sit': {
    method: 'POST',
    endpoint: '/tables/sit',
    args: ['tableID', 'userID', 'buyIn'],
    path: (args) => `/tables/${args[0]}/sit`,
    body: (args) => ({userID: args[1], buyIn: parseInt(args[2])})
  },
  'tables.start': {
    method: 'POST',
    endpoint: '/tables/start',
    args: ['tableID', 'userID'],
    path: (args) => `/tables/${args[0]}/start`,
    body: (args) => ({userID: args[1]})
  },
  'tables.pause': {
    method: 'POST',
    endpoint: '/tables/pause_unpause',
    args: ['tableID', 'userID'],
    path: (args) => `/tables/${args[0]}/pause_unpause`,
    body: (args) => ({userID: args[1]})
  },
  'tables.end': {
    method: 'POST',
    endpoint: '/tables/end',
    args: ['tableID', 'userID'],
    path: (args) => `/tables/${args[0]}/end`,
    body: (args) => ({userID: args[1]})
  },

  // WebSocket
  'ws.connect': {
    special: 'ws-connect',
    args: ['tableID', 'userID'],
    description: 'Connect to WebSocket for table'
  },
  'ws.disconnect': {
    special: 'ws-disconnect',
    args: [],
    description: 'Disconnect from WebSocket'
  },
  'ws.check': {
    special: 'ws-action',
    args: ['tableID', 'userID'],
    action: 'check',
    description: 'Send check action'
  },
  'ws.call': {
    special: 'ws-action',
    args: ['tableID', 'userID'],
    action: 'call',
    description: 'Send call action'
  },
  'ws.raise': {
    special: 'ws-action',
    args: ['tableID', 'userID', 'amount'],
    action: 'raise',
    description: 'Send raise action'
  },
  'ws.fold': {
    special: 'ws-action',
    args: ['tableID', 'userID'],
    action: 'fold',
    description: 'Send fold action'
  },
  'ws.declare': {
    special: 'ws-action',
    args: ['tableID', 'userID', 'declaration'],
    action: 'declare',
    description: 'Send declare action (high/low/both)'
  }
};

const generateHelp = () => {
  const lines = ['Available Commands:', ''];
  lines.push('help                - Show this help message');
  lines.push('clear               - Clear terminal');
  lines.push('');
  lines.push('=== REST API ===');

  Object.entries(API_COMMANDS).forEach(([name, config]) => {
    if (config.special) {
      return;  // Skip WebSocket commands in this section
    }
    const argsList = config.args.join(' ');
    lines.push(`${name.padEnd(20)} - ${config.method} ${config.endpoint}${
        argsList ? ' - Args: ' + argsList : ''}`);
  });

  lines.push('');
  lines.push('=== WebSocket ===');
  Object.entries(API_COMMANDS).forEach(([name, config]) => {
    if (!config.special) return;
    const argsList = config.args.join(' ');
    lines.push(`${name.padEnd(20)} - ${config.description}${
        argsList ? ' - Args: ' + argsList : ''}`);
  });

  return lines;
};

export default function APITester() {
  const [history, setHistory] = useState([
    {type: 'system', content: 'Point Game API Tester v2.0 (with WebSocket)'},
    {type: 'system', content: 'Type "help" for available commands'},
    {type: 'system', content: `REST API: ${API_BASE_URL}`},
    {type: 'system', content: `WebSocket: ${WS_URL}`}
  ]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    // Clean up WebSocket on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const addToHistory = (type, content) => {
    setHistory(prev => [...prev, {type, content, timestamp: Date.now()}]);
  };

  const buildQueryString = (queryParams) => {
    if (!queryParams) return '';
    const params = new URLSearchParams(queryParams);
    return `?${params.toString()}`;
  };

  const executeWebSocketCommand = async (commandName, args, config) => {
    switch (config.special) {
      case 'ws-connect': {
        const [tableID, userID] = args;
        if (ws && ws.readyState === WebSocket.OPEN) {
          addToHistory('error', 'Already connected. Disconnect first.');
          return;
        }

        const newWs = new WebSocket(WS_URL);

        newWs.onopen = () => {
          addToHistory('success', `WebSocket connected to ${WS_URL}`);
          // Send initial connection message
          newWs.send(JSON.stringify({tableID, userID}));
          setWsConnected(true);
        };

        newWs.onmessage = (event) => {
          const data = JSON.parse(event.data);
          addToHistory('ws-message', JSON.stringify(data, null, 2));
        };

        newWs.onerror = (error) => {
          addToHistory('error', 'WebSocket error');
          console.error('WebSocket error:', error);
        };

        newWs.onclose = () => {
          addToHistory('info', 'WebSocket disconnected');
          setWsConnected(false);
          setWs(null);
        };

        setWs(newWs);
        break;
      }

      case 'ws-disconnect': {
        if (ws) {
          ws.close();
          setWs(null);
          setWsConnected(false);
          addToHistory('info', 'Disconnected from WebSocket');
        } else {
          addToHistory('error', 'Not connected');
        }
        break;
      }

      case 'ws-action': {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          addToHistory(
              'error', 'Not connected to WebSocket. Use ws.connect first.');
          return;
        }

        const [tableID, userID, ...rest] = args;
        const payload = {};

        if (config.action === 'raise') {
          payload.amount = parseInt(rest[0]);
        } else if (config.action === 'declare') {
          payload.declaration = rest[0];  // 'high', 'low', or 'both'
        }

        const message = {
          type: 'player_action',
          tableID,
          userID,
          action: config.action,
          payload
        };

        ws.send(JSON.stringify(message));
        addToHistory('ws-send', JSON.stringify(message, null, 2));
        break;
      }
    }
  };

  const executeApiCommand = async (commandName, args) => {
    const config = API_COMMANDS[commandName];

    if (!config) {
      addToHistory('error', `Unknown command: ${commandName}`);
      return;
    }

    // Handle WebSocket commands
    if (config.special) {
      await executeWebSocketCommand(commandName, args, config);
      return;
    }

    // Validate args
    if (args.length < config.args.length) {
      addToHistory('error', `Usage: ${commandName} ${config.args.join(' ')}`);
      return;
    }

    try {
      let url;
      if (config.path) {
        url = API_BASE_URL + config.path(args);
      } else {
        url = API_BASE_URL + config.endpoint;
      }

      const queryParams = config.query ? config.query(args) : null;
      if (queryParams) {
        url += buildQueryString(queryParams);
      }

      const options = {
        method: config.method,
        headers: {'Content-Type': 'application/json'}
      };

      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        options.body = JSON.stringify(config.body(args));
      }

      addToHistory('info', `${config.method} ${url}`);
      const response = await fetch(url, options);

      if (response.status === 204) {
        addToHistory('success', 'Success (No Content)');
        return;
      }

      const data = await response.json();
      addToHistory(
          response.ok ? 'success' : 'error', JSON.stringify(data, null, 2));
    } catch (error) {
      addToHistory('error', `Error: ${error.message}`);
    }
  };

  const executeCommand = async (cmd) => {
    addToHistory('input', `$ ${cmd}`);

    const parts = cmd.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        generateHelp().forEach(line => addToHistory('info', line));
        break;

      case 'clear':
        setHistory([]);
        break;

      default:
        if (API_COMMANDS[command]) {
          await executeApiCommand(command, args);
        } else {
          addToHistory(
              'error',
              `Unknown command: ${
                  command}. Type "help" for available commands.`);
        }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      executeCommand(input);
      setInput('');
    }
  };

  const getLineColor = (type) => {
    switch (type) {
      case 'input':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'info':
        return 'text-yellow-400';
      case 'ws-message':
        return 'text-purple-400';
      case 'ws-send':
        return 'text-cyan-400';
      case 'system':
        return 'text-gray-500 italic';
      default:
        return 'text-gray-100';
    }
  };

  return (
    <div className='h-screen bg-[#0d1117] text-gray-100 flex flex-col font-mono text-sm'>
      {/* Header */}
      <div className='bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex justify-between items-center'>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 rounded-full bg-red-500' />
          <div className='w-3 h-3 rounded-full bg-yellow-500' />
          <div className='w-3 h-3 rounded-full bg-green-500' />
          <span className='ml-4 text-gray-400'>Point Game API Tester</span>
        </div>
        <div className='flex items-center gap-4'>
          <span className={`text-xs ${wsConnected ? 'text-green-400' : 'text-gray-500'}`}>
            WS: {wsConnected ? '● Connected' : '○ Disconnected'}
          </span>
          <span className='text-xs text-gray-500'>{API_BASE_URL}</span>
        </div>
      </div>

      {/* Terminal Output */}
      <div ref={terminalRef} className='flex-1 overflow-y-auto px-4 py-3 space-y-1 leading-relaxed'>
        {history.map((line, i) => (
          <div
            key={i}
            className={`${getLineColor(line.type)} whitespace-pre-wrap break-words`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className='border-t border-gray-700 px-4 py-3 bg-[#0d1117]'>
        <div className='flex items-center gap-2'>
          <span className='text-green-400'>$</span>
          <input
            type='text'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className='flex-1 bg-transparent text-gray-100 outline-none caret-green-400'
            placeholder='Type a command...'
            autoFocus
          />
        </div>
      </div>

      {/* Quick Reference */}
      <div className='border-t border-gray-700 bg-gray-800 p-2 text-xs text-gray-500'>
        Quick: help | clear | auth.signup user pass | tables.create userID 5 10 20 | ws.connect tableID userID
      </div>
    </div>
  );
}