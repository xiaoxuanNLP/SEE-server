const adminDao = require("../models/Dao/adminDao")
const ItemDao = require("../models/Dao/ItemsDao")
const userDao = require("../models/Dao/userDao")


function isCycle(sources,targets) { //判断DAG是否成环,成环是false
    let edges = []
    for(var i = 0;i<sources.length;i++){
        var temp = {};
        temp['source'] = sources[i];//待定
        temp['target'] = targets[i];
        edges.push(temp);
    }
    const nodes = [];
    const list = {}; // 邻接表
    const queue = []; // 入度为0的节点集合
    const indegree = {};
    edges.forEach(e => {
        const { source, target } = e;
        if (!nodes.includes(source)) {
            nodes.push(source);
        }
        if (!nodes.includes(target)) {
            nodes.push(target);
        }
        addEdge(source, target);
    });
    const V = nodes.length;

    nodes.forEach(node => {
        if (!indegree[node]) indegree[node] = 0;
        if (!list[node]) list[node] = [];
    });
    function addEdge(source, target) {
        if (!list[source]) list[source] = [];
        if (!indegree[target]) indegree[target] = 0;
        list[source].push(target);
        indegree[target] += 1;
    }
    function sort() {
        Object.keys(indegree).forEach(id => {
            if (indegree[id] === 0) {
                queue.push(id);
            }
        });
        let count = 0;
        while (queue.length) {
            ++count;
            const currentNode = queue.pop();
            const nodeTargets = list[currentNode];
            for (let i = 0; i < nodeTargets.length; i++) {
                const target = nodeTargets[i];
                indegree[target] -= 1;
                if (indegree[target] === 0) {
                    queue.push(target);
                }
            }
        }
        // false 没有输出全部顶点，有向图中有回路
        return !(count < V);
    }
    return sort();
}

module.exports = {
    startProject: async ctx => {
        let {nums,projectName} = ctx.request.body;
        // let userKind = ctx.session.user.userKind
        // if (userKind !== "admin") {
        //     ctx.body = {
        //         code: '403',
        //         msg: '您无权操作'
        //     }
        //     return
        // }
        projectId = await adminDao.startNewProject(nums,projectName)
        ctx.body = {
            code: '001',
            projectId,
            msg: '项目新建完成,项目号为' + projectId
        }
    },
    stopProject: async ctx => {
        let {project} = ctx.request.body;
        let userKind = ctx.session.user.userKind
        if (userKind !== "admin") {
            ctx.body = {
                code: '403',
                msg: '您无权操作'
            }
            return
        }
        await adminDao.terminationProject(project)
        ctx.body = {
            code:'001',
            msg:'您已终止项目'+project
        }
    },
    restartProject:async ctx=>{
        let{project} = ctx.request.body;
        let userKind = ctx.session.user.userKind
        if (userKind !== "admin") {
            ctx.body = {
                code: '403',
                msg: '您无权操作'
            }
            return
        }
        await adminDao.restartProject(project);
        ctx.body = {
            code:'001',
            msg:'项目重启成功'
        }
    },
    createProject: async ctx =>{
        let {projectName,sorts,accounts,sources,targets} = ctx.request.body;
        // let userKind = ctx.session.user.userKind
        // if (userKind !== "admin") {
        //     ctx.body = {
        //         code: '403',
        //         msg: '您无权操作'
        //     }
        //     return
        // }
        if(!isCycle(sources,targets)){
            ctx.body = {
                code:'000',
                msg:'您的分配的任务顺序产生闭环，无法创建'
            }
        }
        await adminDao.createProject(projectName,sorts,accounts,sources,targets);
        ctx.body = {
            code:'001',
            msg:'创建成功'
        }
    },
    findParticipateProject:async ctx =>{
        const participates = await adminDao.findParticipateProject()
        let userKind = ctx.session.user.userKind
        if (userKind !== "admin") {
            ctx.body = {
                code: '403',
                msg: '您无权操作'
            }
            return
        }
        accounts = []
        projects = []
        projectNames = []
        dones = []
        if(participates.length !== 0){
            let tempProject = participates[0].project;
            projects.push(participates[0].project)
            dones.push(participates[0].done)
            const projectName = await ItemDao.getTheProjectName(participates[0].project)
            projectNames.push(projectName[0].name);
            accountArray = []
            accountArray.push(participates[0].account)

            for(var i=1;i<participates.length;i++){
                if(participates[i].project !== tempProject){
                    accounts.push(accountArray);
                    accountArray = [];
                    tempProject = participates[i].project;
                    projects.push(tempProject);
                    dones.push(participates[i].done);
                    const projectName = await ItemDao.getTheProjectName(tempProject)
                    projectNames.push(projectName[0].name);
                }else{
                    accounts.push(participates[i].account)
                }
            }
            accounts.push(accountArray);
        }
        ctx.body = {
            code:'001',
            accounts,
            projects,
            projectNames,
            dones
        }
    },
    changeOrders:async ctx =>{
        let userKind = ctx.session.user.userKind
        if (userKind !== "admin") {
            ctx.body = {
                code: '403',
                msg: '您无权操作'
            }
            return
        }
        let{ids,orders} = ctx.request.body;//TODO
        await adminDao.changeOrders(ids,orders)
        ctx.body = {
            code:'001',
            msg:'修改成功'
        }
    },
    changePerformPerson:async ctx=>{
        let {id,account} = ctx.request.body;
        let userKind = ctx.session.user.userKind
        if (userKind !== "admin") {
            ctx.body = {
                code: '403',
                msg: '您无权操作'
            }
            return
        }
        await adminDao.changePerformPerson(id,account)
        ctx.body = {
            code:'001',
            msg:'指定成功'
        }
    },
    checkAllProjects: async ctx =>{
        let userKind = ctx.session.user.userKind
        if (userKind !== "admin") {
            ctx.body = {
                code: '403',
                msg: '您无权操作'
            }
            return
        }
        let {project} = ctx.request.body;
        const theProjects = await adminDao.checkTheTaskByProject(project)
        sortsDict = {}
        donesDict = {}
        for (var i=0;i<theProjects.length;i++){
            sortsDict[theProjects[i].id] = theProjects[i].sort;
            donesDict[theProjects[i].id] = theProjects[i].done;
        }
        sources = []
        sourcesSorts = []
        targetSorts = []
        sourcesDones = []
        targetsDones = []
        targets = []

        for(var i=0;i<theProjects.length;i++){
            const oneSequence = adminDao.getTheSequence(theProjects[i].id);
            const sourcesDone = ItemDao.getIsDone(oneSequence[i].thisTask);
            const targetsDone = ItemDao.getIsDone(oneSequence[i].nextTask);
            const sourcesSort = ItemDao.getTheSort(oneSequence[i].thisTask);
            const targetsSort = ItemDao.getTheSort(oneSequence[i].nextTask);
            sources.push(oneSequence[i].thisTask)
            targets.push(oneSequence[i].nextTask)
            sourcesSorts.push(sourcesSort)
            targetSorts.push(targetsSort)
            sourcesDones.push(sourcesDone)
            targetsDones.push(targetsDone)
        }
        const projectName = await ItemDao.getTheProjectName(theProjects[0].project)
        theProjectName = projectName[0].name
        ctx.body = {
            code:'001',
            sources,
            targets,
            sourcesSorts,
            targetSorts,
            sourcesDones,
            targetsDones,
            theProjectName,
        }
    },
    checkStaffA:async ctx=>{
        var accounts = []
        var userNames = []
        const users = await userDao.checkStaffA();
        for(var i = 0;i<users.length;i++){
            accounts.push(users[i].account)
            userNames.push(users[i].userName)
        }
        ctx.body = {
            code:'001',
            accounts,
            userNames
        }
    },
    checkStaffB:async ctx=>{
        var accounts = []
        var userNames = []
        const users = await userDao.checkStaffB();
        for(var i = 0;i<users.length;i++){
            accounts.push(users[i].account)
            userNames.push(users[i].userName)
        }
        ctx.body = {
            code:'001',
            accounts,
            userNames
        }
    },
    checkStaffC:async ctx=>{
        var accounts = []
        var userNames = []
        const users = await userDao.checkStaffC();
        for(var i = 0;i<users.length;i++){
            accounts.push(users[i].account)
            userNames.push(users[i].userName)
        }
        ctx.body = {
            code:'001',
            accounts,
            userNames
        }
    },
    checkAllStaff:async ctx=>{
        const users = await userDao.checkAllStaff();
        var accounts = []
        var sorts = []
        var userNames = []
        for(var i = 0;i<users.length;i++){
            accounts.push(users[i].account)
            sorts.push(users[i].sort)
            userNames.push(users[i].userName)
        }
        ctx.body = {
            code:'001',
            accounts,
            userNames,
            sorts
        }
    },

}