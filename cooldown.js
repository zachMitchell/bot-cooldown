//Made by Zachary Mitchell in 2020!
/*Cooldown is a tool that slows down the use of certain commands. 
Not all of them need it, just ones that can get annoying fast*/

/*This object is basically like a directory structure. It's sorted as follows:
uses - an integer that states how many uses can happen in one spurt
guild - object that holds guilds by ID, for each guild there are ID's for every user.
{
    [guildId]
    {
        Commands - a command that was filtered through the update command
        {
            [user]
            {
                usesLeft - integer that stops user if uses are at 0
                timeStamp - timeStamp of the last message using this command.
            }
        }
    }
}*/

//NOTE: this module was built specifically for Discord.js; you can use it in other places, but you'll have to edit things for it to work.

function guild (id=''){
    this.id=id;
    this.commands = {};
}

/**
 * Record the usage of a command. After recording, the function checks if the user can continue using the command or is blocked.
 * @param {string} cmd name of the command
 * @param {string} userId ID of the user
 * @param {number} timeStamp The exact moment the command was used. Number should be raw unix timestamp
 * @param {boolean} checkOnly Don't record the user's activity. Instead just show the current values/status of an existing cooldown.
 * @returns - undefined if the command doesn't exist, OR {cooldownHit: bool, triedAgain: bool, secondsLeft: number, blocked: bool} - These values don't have to exist
 */
guild.prototype.updateUsage = function(cmd, userId, timeStamp, checkOnly = false){
    var targetCommand = this.commands[cmd],
        commandUser;
    
    if(!targetCommand) return;

    //Look for and assign this variable. If it fails, create something from scratch.
    if(!(commandUser = targetCommand.users[userId]))
        commandUser = targetCommand.users[userId] = new user(userId,targetCommand.uses,timeStamp);

    if(targetCommand.uses === 0 && targetCommand.coolTime == -1){
        var triedAgainOg = commandUser.triedAgain;
        if(!checkOnly) commandUser.triedAgain = true;

        return {blocked: true, triedagain:triedAgainOg};
    }
    
    else if(commandUser.usesLeft > 0){
        if(!checkOnly){
            commandUser.usesLeft--;
            commandUser.timeStamp = timeStamp;
        }
        
        return {cooldownHit:false, triedAgain:false};
    }
    else if((timeStamp - commandUser.timeStamp) / 1000 > targetCommand.coolTime ){
        // console.log((timeStamp - commandUser.timeStamp),timeStamp,commandUser.timeStamp);
        if(!checkOnly){
            commandUser.usesLeft = targetCommand.uses -1;
            commandUser.timeStamp = timeStamp;
            commandUser.triedAgain = false;
        }

        return {cooldownHit:false, triedAgain:false};
    }

    //We hit the cool down trigger; the next time the user tries this again, the bot has the choice not to respond.
    else{
        var triedAgainOg = commandUser.triedAgain;
        commandUser.triedAgain = true;
        return {cooldownHit:true, triedAgain: triedAgainOg, secondsLeft: Math.ceil(( targetCommand.coolTime - ((timeStamp - commandUser.timeStamp) / 1000) ))};
    }
}

/**
 * Adds more time to the clock to potentially reset a command for a user or extend waiting time
 * @param {string} cmd Name of the command
 * @param {string} userId unique identifier for a user
 * @param {number} timeInSeconds how many seconds is being appended to this command?
 * @returns undefined
 */
guild.prototype.appendSeconds = function(cmd, userId, timeInSeconds = 0){
    var targetCommand,
        commandUser;

    if(!(targetCommand = this.commands[cmd])) return;

    if(!(commandUser = targetCommand.users[userId]))
        commandUser = targetCommand.users[userId] = new user(userId,targetCommand.uses,timeStamp);
    
    commandUser.timeStamp += 1000*timeInSeconds;
}

//Adds more usage points without checking if the user can run the command. Does not change the timestamp either.
/**
 * 
 * @param {string} cmd Name of the command
 * @param {string} userId unique identifier for a user
 * @param {number} usagePoints total of points to be added to the exsiting amount. Be careful not to make this a negative number unless you intend on disabling the command for that user.
 * @returns undefined
 */
guild.prototype.appendUses = function(cmd, userId, usagePoints = 0){
    var targetCommand,
        commandUser;

    if(!(targetCommand = this.commands[cmd])) return;

    if(!(commandUser = targetCommand.users[userId]))
        commandUser = targetCommand.users[userId] = new user(userId,targetCommand.uses,timeStamp);
    
    commandUser.usesLeft += usagePoints;
}

function command(uses = 1,coolTime = 30){
    this.uses = uses;
    this.coolTime = coolTime;
    this.users = {}; //Use this to store user objects
}

function user(id = '',usesLeft = 1, timeStamp = 0){
    this.id = id;
    this.usesLeft = usesLeft;
    this.timeStamp = timeStamp;
    this.triedAgain = false;
}

/**
 * Creates a container that's designed to hold the usage of commands. Usage of each command is separated by each group/guild. That means if one server/group is using commands, it won't affect the usage of another server/group.
 */
function guildGroup(){}

/*Create a config for a specific guild. This can be retrieved from any source you like (most likely a database or a default)

Inside the config should be an object that's json friendly:
'commandName':{
    coolTime:30
    uses:12345
}

linkTo allows configs to bind with eachother. If the new config has items that conflict with the linked one, it will override the linked setting.
groups should be imported without issue, as group names are treated as standard commands. However overidden commands won't respect the original group most likely.
(has the potential ability to be very recursive 0_o)
(linkTo will not be a end-user feature... it's too niche & complex XP)*/

/**
 * Create a configuration for a guild/group. Configurations can be combined with others in order to have more flexebility. Combined configurations will have the `config` overwritten by what `linkTo` will be.
 * @param {string} guildId The target discord server / group you're applying this configuration to
 * @param {object} config Contains information about how often commands can be used. Commands can also be grouped together to contain the same time & usage points.
 * ```
 * //Example config
 * var myConfig = {
 *  //command-name can be used 3 times every 10 seconds. If the user goes beyond 3, they will wait the remaining seconds before using it again
 *  'command-name':{ uses:3, coolTime:10 },
 *  
 *  //commands can be grouped together to have the same values:
 *  'myCommandGroup':{ isGroup:true, uses: 1, coolTime: 60, commands:['foo','bar'] },
 * 
 *  //Groups with "glue" cause a domino effect. If one command is used, all the others are "used" too.
 *  'myGluedCommands':{ isGroup:true, glue:true, uses: 2, coolTime: 120, commands:['lorem', 'ipsum'] }
 * }
 * ```
 * @param {guild} linkTo a `guild` object will be a base for your new config. Any duplicate commands defined here are overwritten by `config`.
 * @returns guild - the new configuration for that guild. Contains functions for updating the usage & appending seconds or usage points for commands.
 */
guildGroup.prototype.createConfig = function(guildId, config, linkTo){
    this[guildId] = new guild(guildId);

    //Import a linked configuration
    if(typeof linkTo == 'object'){
        for(var i in linkTo.commands)
            this[guildId].commands[i] = linkTo.commands[i];
    }

    for(let i in config){
        if(!config[i].isGroup || config[i].commands.length)
            this[guildId].commands[i] = new command(config[i].uses,config[i].coolTime);

        //Groups are a basic way to bind a single cooldown instance to more commands.
        //If glue is set to true: if one command gets a cooldown, so will the others. Otherwise cooldown times are independent.
        if(config[i].isGroup){
            if(config[i].glue) for(let j of config[i].commands)
                this[guildId].commands[j] = this[guildId].commands[i];

            else for( let j of config[i].commands)
                this[guildId].commands[j] = new command(config[i].uses,config[i].coolTime);
        }
        
    }
    return this[guildId];
}

if(typeof module == 'object' && module.exports) module.exports = {
    guildGroup:guildGroup,
    guild:guild
}