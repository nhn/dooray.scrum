require('./router/dbManager').createTables()
.then(() => {
    console.log('DONE');
    process.exit();
});