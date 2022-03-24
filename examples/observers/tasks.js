import {reactive,observer,unobserve} from "../../index.js";

const tasks = reactive([{name:"task1",duration:2000},{name:"task2",duration:3000},{name:"task3",duration:1000}, {name:"task4",duration:2000}]);

const doTasks = observer(() => {
    const task = tasks.currentTask = unobserve(() => tasks.shift());
    if (task) {
        setTimeout(() => task.complete = true, task.duration);
        // will access all properties
        console.log("doing:", unobserve(() => JSON.stringify(tasks.currentTask)));
        observer(() => {
            if (tasks.currentTask?.complete) {
                // will access all properties
                console.log("completed:", unobserve(() => JSON.stringify(tasks.currentTask)));
                doTasks();
            }
        })
    } else {
        console.log("Waiting for more tasks ...");
        const interval = setInterval(() => {
            if (tasks.length > 0) {
                clearInterval(interval);
                doTasks();
            }
        })
    }
})
setTimeout(() => tasks.push(reactive({name:"task5",duration:2000})),10000);
