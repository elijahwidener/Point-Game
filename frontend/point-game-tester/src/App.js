import React, {useEffect, useRef, useState} from 'react';

const API_BASE_URL =
    'https://52keqe3is0.execute-api.us-east-1.amazonaws.com/prod';

const API_COMMANDS = {

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

  'tables.end': {
    method: 'POST',
    endpoint: '/tables/end',
    args: ['tableID', 'userID'],
    path: (args) => `/tables/${args[0]}/end`,
    body: (args) => ({userID: args[1]})
  }
};

const generateHelp = () => {
  const lines = ['Available Commands:', ''];
  lines.push('help                - Show this help message');
  lines.push('clear               - Clear terminal');
  lines.push('');

  Object.entries(API_COMMANDS).forEach(([name, config]) => {
    const argsList = config.args.join(' ');
    lines.push(`${name.padEnd(20)} - ${config.method} ${config.endpoint}${
        argsList ? ' - Args: ' + argsList : ''}`);
  });

  return lines;
};

export default function APITester() {
  const [history, setHistory] = useState([
    {type: 'system', content: 'Point Game API Tester v1.0'},
    {type: 'system', content: 'Type "help" for available commands'},
    {type: 'system', content: `Current API URL: ${API_BASE_URL}`}
  ]);
  const [input, setInput] = useState('');
  const [apiUrl] = useState(API_BASE_URL);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const addToHistory = (type, content) => {
    setHistory(prev => [...prev, {type, content, timestamp: Date.now()}]);
  };

  const buildQueryString = (queryParams) => {
    if (!queryParams) return '';
    const params = new URLSearchParams(queryParams);
    return `?${params.toString()}`;
  };

  const executeApiCommand = async (commandName, args) => {
    const config = API_COMMANDS[commandName];

    if (!config) {
      addToHistory('error', `Unknown command: ${commandName}`);
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
        url = apiUrl + config.path(args);
      } else {
        url = apiUrl + config.endpoint;
      }

      // Add query params
      const queryParams = config.query ? config.query(args) : null;
      if (queryParams) {
        url += buildQueryString(queryParams);
      }

      // Build request options
      const options = {
        method: config.method,
        headers: {'Content-Type': 'application/json'}
      };

      // Add body for POST/PUT/PATCH
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        options.body = JSON.stringify(config.body(args));
      }

      // Make request
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

    // Handle special commands
    switch (command) {
      case 'help':
        generateHelp().forEach(line => addToHistory('info', line));
        break;

      case 'clear':
        setHistory([]);
        break;

      default:
        // Try to execute as API command
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
      case 'system':
        return 'text-gray-500 italic';
      default:
        return 'text-gray-100';
    }
  };

return (
  <div className='h-screen bg-[#0d1117] text-gray-100 flex flex-col font-mono text-sm'>
      {/* Header */}
      <div className='bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex justify-between'>
  <div className='flex items-center gap-2'>
    <div className='w-3 h-3 rounded-full bg-red-500' />
    <div className='w-3 h-3 rounded-full bg-yellow-500' />
    <div className='w-3 h-3 rounded-full bg-green-500' />
    <span className='ml-4 text-gray-400'>Point Game API Tester</span>
  </div>
  <span className='text-xs text-gray-500'>{apiUrl}</span>
  </div>

  {/* Terminal Output */}
  <div
ref = {terminalRef} className =
    'flex-1 overflow-y-auto px-4 py-3 space-y-1 leading-relaxed' > {history.map((line, i) => (
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
        type = 'text'
        value = {input} onChange = {(e) => setInput(e.target.value)} onKeyDown =
            {handleKeyDown} className =
                'flex-1 bg-transparent text-gray-100 outline-none caret-green-400'
        placeholder = 'Type a command...'
              autoFocus
      />
    </div>
  </div>
        {/* Quick Reference */}
        <div className='border-t border-gray-700 bg-gray-800 p-2 text-xs text-gray-500'>
          Quick: help | clear | auth.signup user pass | auth.login user pass | me.get userId
        </div>
      </div>
  );
    }