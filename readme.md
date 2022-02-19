# Discord Bot Cooldown

This package creates a cooldown system for Discord bot commands. It can also be used in non-discord applications as well, so as long one can provide details for a group ID, a user ID and a list of commands.

## The details!

* A **cooldown system** is a method of moderation; it prevents commands from being spammed all the time. This system accomplishes the task by sorting out the users using the command. Every user has a limit to how often they can use a command. If they go over those limits, the cooldown system will detect it. It can also detect at least one extra re-attempt.
* Commands have two main parameters: `uses` and `coolTime`
    * `uses` - how many times can a user run this command?
    * `coolTime` - How often is the user allowed to use the command (**in seconds**)? Upon first use, the clock ticks until it reaches `0`. If the user takes up all of their `uses`, the cooldown is hit, and they will need to wait until the time reaches `0` again to use the command.
    * If you set `uses` to `0` and `coolTime` to `-1`, the command will be **blocked**
* This module supports **grouping** like-commands together. That means a collection of commands can have the same settings without having to copy/paste everything
    * Also available is the ability to `glue` their usage together. For example: commands `/a`, `/b` and `/c` are grouped together. The user executes `/a`, then `/b` and finally tries `/c`, however, `/c` is blocked because there was only 3 uses available shared between those 3 commands

## Setup

## Import the module

```js
const cooldown = require('bot-cooldown');
```

### Configure the cooldowns. They can be in groups if you like

```js
const commandCooldowns = {
    //Assign one:
    'ping':{ uses: 2, coolTime: 10 },

    //Assign multiple at once:
    'botTools':{
        isGroup:true, //Groups need this boolean
        uses: 4,
        coolTime: 60, //Time in seconds
        commands:['deploycommands','deletecommands']
    },

    //Assign a group of commands that depend on eachother for uses:
    'pictureCommands':{
        isGroup:true,
        glue:true, //This chains commands together. If one command is used, the others in this group are considered used too
        uses:1,
        coolTime:120,
        commands:['keyboardcat', 'sandwhich-on-wheat-bread', 'e', 'rainbow']
    },

    //Disable a command from being used:
    'doallthethings':{
        //uses must be 0, and coolTime must be -1
        uses:0,
        coolTime:-1
    }
};
```

### Create a new guildGroup and assign a guild to your configuration

```js
var fancyNewGuildGroup = new cooldown.guildGroup();

//You need a guild ID as the first parameter and your configuration as the second
var guildConfiguration = fancyNewGuildGroup.createConfig('1234567890', commandCooldowns);
```

### Record the usage of your command

```js
//From left to right: command name, user's id, unix time number (current time)
var commandStatus = fancyNewGuildGroup['1234567890'].updateUsage('keyboardcat', '0987654321', (new Date()).getTime());
//^ Should come back with {cooldownHit: false, triedAgain: false}

if(commandStatus.blocked){
    //Tell the user the commmand was blocked
    return;
}

else if(commandStatus.cooldownHit){
    if(!commandStatus.triedAgain){
        //The user just hit the cooldown, present a message
        console.warn('Cooldown hit! User needs to wait '+commandStatus.secondsLeft+' more seconds to use the command.');
    }
    //If the user tried again after this, ignore
    return;
}

else{
    //Run the command
}
```

## Other useful functions

You can optionally add or remove the seconds an individual user has until they can use the command again. You will have to re-run this every time you want to expand or shrink the time for a specific person

```js
guildConfiguration.appendSeconds('keyboardcat','0987654321', 30); //Add 30 more seconds to the clock
```

Uses can also be appended to. You could for example let a user run the command an extra 10 times

```js
guildConfiguration.appendUses('keyboardcat','0987654321', 10);
```

## (Advanced) Linking other configurations together

When configuring a guild, you can attach another configuration to it too.

```js
var myOtherConfiguration = fancyNewGuildGroup.createConfig('9999999999',{'ping':{uses:-1, coolTime:0}}, guildConfiguration);
```

In this example, `guildConfiguration` is our base. It has all the commands that were defined like last time, only now, in our second parameter of `createConfig` we have a new setting for `ping` that overrides the one found in `guildConfiguration`. Over in this discord server, `ping` is disabled, whereas in the first one, it is not.

## Use case

[Lemonbot](https://lemonbot.net) is a discord bot that makes use of this module. It actually contains 3 layers of groups to moderate command activity: server, DM's and user.

* Server commands affect the cooldown on the server that launched the command
* The DM group is used to moderate the usage when *not* in a server. For example there may be a command that functionally can't work in a DM because it needs multiple users to interact with it. Such commands may need to be disabled on a DM
* The user commands ignore the server all together and instead record what the user is doing as a whole. If they use a command in one place, it will affect their usage in another.

All of this was programmed outside this module, but is an example of advanced techniques for protecting commands depending on the context.

# Notes

* This module isn't picky if your usage is discord related or not. Theoretically it could also be used for something like a slack bot, IRC bot or website rendering.
* This work is licensed under a [Creative Commons Attribution 4.0 International License.](http://creativecommons.org/licenses/by/4.0/)