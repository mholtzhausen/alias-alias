#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.custom-commands.json');

async function loadCommands() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveCommands(commands) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(commands, null, 2));
}

async function runCommand(alias) {
  const commands = await loadCommands();
  if (!commands[alias]) {
    console.log(chalk.red(`Error: Command "${alias}" not found.`));
    return;
  }

  console.log(chalk.blue(`Executing command: ${commands[alias]}`));
  try {
    execSync(commands[alias], { stdio: 'inherit' });
  } catch (error) {
    console.log(chalk.red(`Error executing command: ${error.message}`));
  }
}

program
  .version('1.0.0')
  .description('CLI tool for managing custom commands and command sequences');

program
  .command('add <alias>')
  .description('Add a new custom command')
  .action(async (alias) => {
    const commands = await loadCommands();
    if (commands[alias]) {
      console.log(chalk.yellow(`Warning: Overwriting existing command for alias "${alias}"`));
    }

    const { command } = await inquirer.prompt([
      {
        type: 'input',
        name: 'command',
        message: 'Enter the command or command sequence:',
      },
    ]);

    commands[alias] = command;
    await saveCommands(commands);
    console.log(chalk.green(`Command "${alias}" added successfully.`));
  });

program
  .command('list')
  .description('List all custom commands')
  .action(async () => {
    const commands = await loadCommands();
    if (Object.keys(commands).length === 0) {
      console.log(chalk.yellow('No custom commands found.'));
      return;
    }

    console.log(chalk.blue('Custom Commands:'));
    for (const [alias, command] of Object.entries(commands)) {
      console.log(`${chalk.green(alias)}: ${command}`);
    }
  });

program
  .command('edit <alias>')
  .description('Edit an existing custom command')
  .action(async (alias) => {
    const commands = await loadCommands();
    if (!commands[alias]) {
      console.log(chalk.red(`Error: Command "${alias}" not found.`));
      return;
    }

    const { newCommand } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newCommand',
        message: 'Enter the new command or command sequence:',
        default: commands[alias],
      },
    ]);

    commands[alias] = newCommand;
    await saveCommands(commands);
    console.log(chalk.green(`Command "${alias}" updated successfully.`));
  });

program
  .command('delete <alias>')
  .description('Delete a custom command')
  .action(async (alias) => {
    const commands = await loadCommands();
    if (!commands[alias]) {
      console.log(chalk.red(`Error: Command "${alias}" not found.`));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to delete the command "${alias}"?`,
        default: false,
      },
    ]);

    if (confirm) {
      delete commands[alias];
      await saveCommands(commands);
      console.log(chalk.green(`Command "${alias}" deleted successfully.`));
    } else {
      console.log(chalk.yellow('Deletion cancelled.'));
    }
  });

// Set 'run' as the default command
program
  .arguments('<alias>')
  .description('Run a custom command (default)')
  .action(runCommand);

program.parse(process.argv);

// If no arguments are provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}