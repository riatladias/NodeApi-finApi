const { response, request } = require('express');
const express = require('express');
const { v4: uuidV4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = [];

// Middleware (verificação de cpf existente)
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find(customer => customer.cpf == cpf);

    if (!customer) {
        return response.status(400).json({ error: "Customer not found" })
    }

    request.customer = customer;

    return next();
}
// Balance
function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === "credit") {
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    }, 0);

    return balance;
}

// Criar uma conta
app.post("/account", (request, response) => {
    const { name, cpf } = request.body;

    const customersAlreadyExist = customers.some(customers => customers.cpf === cpf);

    if (customersAlreadyExist) {
        return response.status(400).json({ error: "Customer already Exist!" })
    }

    customers.push({
        cpf,
        name,
        id: uuidV4(),
        statement: [],
    });

    return response.status(201).send();
});

// buscar o extrato bancário
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer.statement);
});

// deposito
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

// saque
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if (balance < amount) {
        return response.status(400).json({ error: "Insufficient funds!" })
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

// buscar o extrato bancário por data
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const { date } = request.query

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) =>
        statement.created_at.toDateString() === new Date(dateFormat).toDateString());

    return response.json(statement);
});

// alteração de dados cadastrais 
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

// obter os dados da conta
app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    console.log(customer);
    return response.json(customer);
});

// deletar a conta
app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    customers.splice(customers.indexOf(customer), 1);

    return response.status(200).json(customers);
});

// balance
app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
});

app.listen(3333);