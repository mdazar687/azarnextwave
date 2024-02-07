const express = require('express')
const isValid = require('date-fns/isValid')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server running at http://localhost:3000'),
    )
  } catch (error) {
    console.log(`Db Error ${error.messgae}`)
  }
}

initializeDbAndServer()

const authenticateApi = async (request, response, next) => {
  let condition = true
  let requestApi = request.query
  var {
    status = '',
    priority = '',
    date = '',
    category = '',
    dueDate = '',
  } = requestApi
  const validDatas = {
    status: ['TO DO', 'IN PROGRESS', 'DONE'],
    priority: ['HIGH', 'MEDIUM', 'LOW'],
    category: ['WORK', 'HOME', 'LEARNING'],
  }
  if (Object.keys(requestApi).length === 0) {
    var {status = '', priority = '', dueDate = '', category = ''} = request.body
  }
  if (status !== '') {
    if (!validDatas['status'].includes(status)) {
      response.status(400)
      response.send('Invalid Todo Status')
      condition = false
    }
  }
  if (priority !== '') {
    if (!validDatas['priority'].includes(priority)) {
      response.status(400)
      response.send('Invalid Todo Priority')
      condition = false
    }
  }
  if (category !== '') {
    if (!validDatas['category'].includes(category)) {
      response.status(400)
      response.send('Invalid Todo Category')
      condition = false
    }
  }
  if (date !== '' || dueDate !== '') {
    if (dueDate !== '') {
      date = dueDate
    }
    const isValidDate = isValid(new Date(date))
    if (isValidDate === false) {
      response.status(400)
      response.send('Invalid Due Date')
      condition = false
    }
  }
  if (condition === true) {
    next()
  }
}

app.get('/todos/', authenticateApi, async (request, response) => {
  const {
    priority = '',
    status = '',
    category = '',
    search_q = '',
  } = request.query
  let dbQuery = ''
  if (priority !== '' && status !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE priority = '${priority}' AND status = '${status}'`
  } else if (priority !== '' && category !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE priority = '${priority}' AND category = '${category}'`
  } else if (status !== '' && category !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE category = '${category}' AND status = '${status}'`
  } else if (status !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE status = '${status}'`
  } else if (priority !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE priority = '${priority}'`
  } else if (category !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE category = '${category}'`
  } else if (search_q !== '') {
    dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE todo LIKE '%${search_q}%'`
  }
  const todoList = await db.all(dbQuery)
  response.send(todoList)
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const dbQuery = ` SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE id = ${todoId}`
  const todo = await db.get(dbQuery)
  response.send(todo)
})

app.get('/agenda/', authenticateApi, async (request, response) => {
  let {date} = request.query
  date = date.split('-')
  if (date[1].length < 2) {
    date[1] = '0' + date[1]
  }
  if (date[2].length < 2) {
    date[2] = '0' + date[2]
  }
  date = date.join('-')
  const dbQuery = `SELECT id, todo, category, status, priority, due_date AS dueDate FROM todo WHERE due_date = '${date}'`
  const todo = await db.all(dbQuery)
  response.send(todo)
})

app.post('/todos/', authenticateApi, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const dbQuery = `
      INSERT INTO todo (id, todo, category, priority, status, due_date)
      values(${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}')`
  await db.run(dbQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', authenticateApi, async (request, response) => {
  let {
    status = '',
    priority = '',
    dueDate = '',
    todo = '',
    category = '',
  } = request.body
  const {todoId} = request.params
  let dbQuery = ''
  if (status !== '') {
    dbQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId}`
    await db.run(dbQuery)
    response.send('Status Updated')
  } else if (priority !== '') {
    dbQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId}`
    await db.run(dbQuery)
    response.send('Priority Updated')
  } else if (dueDate !== '') {
    dueDate = dueDate.split('-')
    if (dueDate[1].length < 2) {
      dueDate[1] = '0' + dueDate[1]
    }
    if (dueDate[2].length < 2) {
      dueDate[2] = '0' + dueDate[2]
    }
    dueDate = dueDate.join('-')
    dbQuery = `UPDATE todo SET due_date = '${dueDate}' WHERE id = ${todoId}`
    await db.run(dbQuery)
    response.send('Due Date Updated')
  } else if (category !== '') {
    dbQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId}`
    await db.run(dbQuery)
    response.send('Category Updated')
  } else if (todo !== '') {
    dbQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId}`
    await db.run(dbQuery)
    response.send('Todo Updated')
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const dbQuery = `DELETE FROM todo WHERE id = ${todoId}`
  await db.run(dbQuery)
  response.send('Todo Deleted')
})

module.exports = app
