#!/usr/bin/env node
const ezt = require('commander');
const chalk = require('chalk');
const knack = require('./modules/knack-connector.js');
const prompt = require('prompt');
const uniTable = require('cli-table2')
const inquirer = require('inquirer');

knack.storage.initSync({
	dir: require('os').homedir() + '/.node/ezt/.node-persist/storage',
	stringify: JSON.stringify,
	parse: JSON.parse
});
/*
Uses:
	-l Get list of tasks
		Might select a task
			Show details about selected task
			Ability to start/stop selected task
				(starting/stopping should automatically affect another task)

	-s Select a task
		Will also submit notes specified after flag

	See what everyone else is on
*/

/* PROCESS ARGUMENTS */
ezt
	.option('-d', 'clears the storage of cached user and token', () => {
		knack.storage.clear()
	})
	.option('-s', 'Prompts for a task selection', () => {
		selectTask();
	})
	.option('-r', 'executes the main loop', () => {
		main();
	})
	
	.parse(process.argv)

/* SELECT A USERS TASK */


/* MAIN PROCESS */
function main() {
	prompt.start();
	console.log('Authenticating...')
	Promise.all([knack.storage.get('email'), knack.storage.get('token')])
		.then(values => {
			if (typeof values[0] !== 'undefined' && typeof values[1] !== 'undefined') {
				console.log(`Found stored user : ${chalk.cyan(values[0])}`)
				console.log(`Found stored token: ${chalk.gray(values[1].slice(0, 20) + '...')}`)
				const userTasks = userTasks(values[1]);
				console.log(userTasks.toString())
				const selectedTask = promptUserTask(userTasks)
			} else {
				authenticateUser();
			}
		})

}

function selectTask() {
	knack.storage.get('tasks').then(tasks => {
		if (tasks) {
			displayTaskTable(tasks)
		}
	})
}

function displayTaskTable(tasks) {
	const table = new uniTable({
		head: ['', 'Due', 'Task', 'Desc', 'Proj', 'Mile', 'bHrs', 'aHrs', 'Status'],
		colWidths: [4, 12, 6, 40, 30, 20, 7, 7, 10],
	})
	table.push(tasks)
	console.log(table.toString());
}

function userTasks(token) {
	console.log('Getting user tasks...')
	const table = new uniTable({
		head: ['', 'Due', 'Task', 'Desc', 'Proj', 'Mile', 'bHrs', 'aHrs', 'Status'],
		colWidths: [4, 12, 6, 40, 30, 20, 7, 7, 10]
	})
	knack.getTaskList(token).then(tasks => {
		for (let task of tasks) {
			table.push(colorTask(tasks.indexOf(task), task))
		}
	})
	return table;
}

function colorTask(index, task) {
	const taskArray = [index]
	for (let prop of Object.keys(task)) {

		taskArray.push(task[prop].trim())
	}
	return taskArray

}

function promptUserTask(tasks) {
	console.log(tasks);
	prompt.start()
	prompt.get(['index'], (err, result) => {

	})
}

function authenticateUser() {
	const schema = {
		properties: {
			email: {
				description: 'Email',
				pattern: /\w*(\@easyforms\.co\.nz)/,
				message: 'Must be a valid easyforms email',
				required: true
			},
			password: {
				description: 'Password',
				hidden: true
			}
		}
	}
	prompt.get(schema, (err, result) => {
		console.log(`Authenticating as ${chalk.bold.cyan(result.email)}`)
		knack.authenticateUser(result.email, result.password)
			.then(token => {
				console.log(chalk.black.bgGreen('Authentication successful'));
				userTasks(token)
			})
			.catch(err => {
				console.log(chalk.bgRed(err.message));
				authenticateUser();
			})
	})
}