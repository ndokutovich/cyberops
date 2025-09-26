Missions and Maps:

1. add more agents to maps (for all 5)

2\. check obejctives of mission and how their checked (for all of tasks of all missions)

3\. on mission compelte\\faile modal let extend inf o we show: tasks list with compelted and failed\\other stats\\ items collected\\





add to HUD (all modes):

**1) let add ability to command for unselected rest of team to hold position \\ patrol (autofire if enemy approach).**

2\) log with events and actions occurred: hit \\ deaths, hacks, collecing items (enemies, allyes)



How intel works?









in hub:

if I selected Cancel in mission selection - it not return me to hub, just whire screen.



Let add in hub button Next mission - that just start (show mission brief) next uncompeleted mission without manual selection







let make HUD onscreen action applied to selected agents (not only current one) if clieck mouse.

let show point of destination for all of selected agents when clicked (like 4 rounds insted of one)

let make our path support miltiple points selected with shift (list of points), reset if clicked withoud shift.

let make mission log autoscrollable



let redesign UI of view  of Hall of Glory to be cimular to restof ui



let make add game accelettion 2x\\4x, should increate playrate (too fasm move throur empy long areas, etc). Can be impemented like drop to 1x just after enemies in some range detected



let add neitral npc's, hack(like bomb, or any other ineraction) action should interact with ncp

Let create dialog based system (avatar + typing text). avalaiblity to choose answer.

let add multistep mission, with npc interaction

let add optinal missions with npc to all of 5 maps. npm can give mission inside one map





How do you think - is it possible to add toogable turn-based mode (toogle back only when all of agents make their moves). need to add chanartecrictic like initative, action points

It should be supported in all of view modes (all E key cycle). Space key (now in game it cause pause, but maybe because of default contlol selection) can enable\\disable it (if not used, or any unsed other key)



So let introduce full  RGP system support:



Stats, perks, skills, classes. all of pawn in game should inherit stat system. Then it should hierracilayy spread across npc, agents, enemies.



Experience and level-up support, giving stat points, skill points, percs (need declarative rule how many and when and what)



Inventory. Let make campaign items set and then shops, inventory using insances of this set. should be coupled to. also should have their own stats (less compicated as pawn, but still comprehensive. )

Need to be able to specify sfx, vfx, shaking if suitable, when suitable.

And whole this system should unite all aspects of game.



Let att comprehensive mission and quest system. I want it  fully support of multistep quests with branchin, triggering events, etc. different reward and stat cnahging.



Will we manage it? ))) Everything should carefully merged in existing system with non brakin changes.



All these thing should have macimaly declarative and compatible configs with current system.







Now let plan and implement all of old system modals dialog to  of @GAME\_STATE\_REFERENCE.md following

  @DIALOG\_CONVERSION\_GUIDE.md and create tests following current test approach.

