# Chore Ledger

A family chore tracker with a pet game and a family bank.

- Kids log chores; parents approve them with a swipe (right approves, left denies, with undo).
- Approved chores run a small top-down town game. Each kid designs a character, picks a pet from the professor,
  and walks around town with the pet following. Kitchen chores earn food coins for meals at the Store,
  self-care earns care coins for bath kits, bedtime chores earn tuck-ins at home, exercise earns play time at the Park.
  Neglected pets show it: starving pets dig in the dumpster and get thin, dirty pets get messy and stinky,
  tired pets nap and drag behind, unexercised pets get pudgy and grumpy. Pets evolve at level 5 and 15 and then
  move into the kid's house, where siblings can visit them.
- Adventure passes reward big jobs. Mark chores as big jobs in Setup; a kid whose big jobs are approved gets a pass
  (a golden one with more minutes if they were done early), and when every big job in the house is done everyone gets
  a pass plus a small chance of finding a rare egg. Passes open the Adventure Gate during the hours you set:
  - Sunny Beach: dig at X marks, fish off the pier, and open chests that only some pet types can reach.
  - Cruise Ship: clean the Lido Deck. Plates go to the dish station, glasses to the bar, towels to the towel cart,
    and puddles by the pool get mopped. Each job earns deck tickets for prizes (a well-cared-for pet carries one extra item).
  Finds go in a wardrobe (hats, dyes) and a collection book in the kid's house. Vacation mode relaxes the chore list
  to travel chores, slows pet needs and opens adventures all day.
- Parents get their own app on their phones (approvals, accounts, chores, setup, no pet game) and a character in town
  who hangs out at the spot they pick, like the bank or the Store.
- The bank handles chore paydays, bounties (split between kids by share), pet evolution rewards, a weekly
  allowance account, transfers and purchase requests. `bank.html` is a PIN-locked bank app for a parent's phone.

Plain HTML/CSS/JS in ES5, no build step. Data lives in your own free Firebase project; nothing about your family is in this code.
See SETUP.md.
