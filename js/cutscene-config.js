/**
 * Cutscene Configuration
 * Declarative definitions for all campaign cutscenes
 */

(function() {
    const CUTSCENE_CONFIG = {
        // Global settings
        settings: {
            defaultTextSpeed: 30,
            defaultSceneDuration: null, // null = manual advance
            skipEnabled: true,
            fadeTransitionDuration: 500
        },

        // All cutscenes
        cutscenes: {

            // ==========================================
            // GAME INTRO - Before Act 1
            // ==========================================
            'game-intro': {
                id: 'game-intro',
                type: 'cinematic',
                music: 'music/cutscenes/intro-theme.mp3',
                scenes: [
                    {
                        id: 'world-intro',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a0a2e)',
                        elements: [
                            { type: 'title', text: 'THE SYNDICATE', animation: 'fade-in', delay: 2000 },
                            { type: 'divider', delay: 500 },
                            { type: 'text', content: '2087. The megacorporations rule the world.', typewriter: true, delay: 1000 },
                            { type: 'text', content: 'Governments are puppets. Democracy is a memory.\nThe gap between rich and poor has become an abyss.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'nexus-intro',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'text', content: 'Among the giants, one name stands above all:', typewriter: true, delay: 1000 },
                            { type: 'title', text: 'NEXUS CORPORATION', animation: 'glow', class: 'text-red', delay: 2000 },
                            { type: 'text', content: 'Surveillance. Weapons. Control.\nThey see everything. They own everything.', typewriter: true, delay: 1500 },
                            { type: 'text', content: 'And now, they\'re building something new.\nSomething that will change the world forever.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'syndicate-intro',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'text', content: 'But in the shadows, resistance grows.', typewriter: true, delay: 1000 },
                            { type: 'text', content: 'We are THE SYNDICATE - former soldiers, hackers,\nidealists who refuse to kneel.', typewriter: true, delay: 1500 },
                            { type: 'divider', delay: 500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'You\'ve been chosen, operative.\nYour skills caught our attention.\nYour hatred of the corps matches our own.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Welcome to the fight.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'call-to-action',
                        background: 'linear-gradient(135deg, #0a0a0a, #000000)',
                        elements: [
                            { type: 'title', text: 'The war for humanity\'s future begins now.', animation: 'fade-in', delay: 3000 }
                        ]
                    }
                ],
                onComplete: 'navigate:hub'
            },

            // ==========================================
            // ACT 1 INTRO - Plays before first mission of Act 1
            // ==========================================
            'act1-intro': {
                id: 'act1-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'act-title',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'subtitle', text: 'ACT ONE', animation: 'fade-in', delay: 1500 },
                            { type: 'title', text: 'BEGINNING OPERATIONS', animation: 'slide-up', delay: 2000 }
                        ]
                    },
                    {
                        id: 'briefing',
                        background: 'linear-gradient(135deg, #0a1a1a, #1a2e2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Nexus Corporation. On the surface, they\'re a technology company. Surveillance systems, consumer electronics, "smart city" infrastructure.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'But our sources tell a different story.\nBlack sites. Missing scientists.\nMassive government contracts that don\'t exist on any public record.', typewriter: true, delay: 2000 },
                            { type: 'text', content: 'Something called "Project Convergence."\nWe don\'t know what it is yet.\nBut we\'re going to find out.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'target',
                        background: 'linear-gradient(135deg, #1a0a1a, #2e1a2e)',
                        elements: [
                            { type: 'location', name: 'NEW YORK CITY', subtitle: 'NEXUS CORPORATION HQ', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Your first target: Nexus headquarters.\nGet in. Get the data. Get out alive.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'navigate:hub'
            },

            // ==========================================
            // MISSION 1-001: DATA HEIST
            // ==========================================
            'mission-01-001-intro': {
                id: 'mission-01-001-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'location',
                        background: 'linear-gradient(135deg, #0a0a2e, #1a1a4e)',
                        elements: [
                            { type: 'location', name: 'NEW YORK CITY', subtitle: 'NEXUS CORPORATION HEADQUARTERS', time: '02:47 LOCAL TIME', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'briefing',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Nexus tower. Eighty floors of corporate evil.\nSecurity is tight - motion sensors, armed guards,\nbiometric locks on every door.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Your objective: reach the mainframe on floor 47.\nDownload everything. We need proof of what they\'re hiding.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'warning',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'AGENT', content: 'And if we\'re spotted?', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Try not to be. But if it comes to it...\ndo what you have to do.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Good luck, operatives. The Syndicate is watching.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'execute:startMissionGameplay'
            },

            'mission-01-001-outro': {
                id: 'mission-01-001-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'escape',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'text', content: 'Extraction successful.', animation: 'fade-in', delay: 1500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'We\'re receiving the data now. Good work.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'revelation',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Wait... this is... my God.', typewriter: true, delay: 1500 },
                            { type: 'text', content: 'Files revealed:\n- PROJECT CONVERGENCE - PHASE 1\n- GOVERNMENT LIAISON - CLASSIFIED\n- SENATOR BLACKWOOD - PAYMENT CONFIRMED', class: 'text-terminal', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'They\'re not just building weapons.\nThey\'ve bought the government.\nBillions in black budget funding.\nThis goes all the way to the top.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'next-steps',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'AGENT', content: 'What\'s Convergence?', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'I don\'t know yet. But the money trail leads to London.\nA government research facility.\nThat\'s our next target.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Rest up. This is bigger than we imagined.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'navigate:victory'
            },

            // ==========================================
            // MISSION 1-002: GOVERNMENT FACILITY
            // ==========================================
            'mission-01-002-intro': {
                id: 'mission-01-002-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'location',
                        background: 'linear-gradient(135deg, #1a1a2e, #2e2e4e)',
                        elements: [
                            { type: 'location', name: 'LONDON, ENGLAND', subtitle: 'MINISTRY OF DEFENCE - BLACK SITE OMEGA', time: 'THREE DAYS LATER', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'briefing',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'The money from New York traces here.\nOfficially, this facility doesn\'t exist.\nUnofficially, billions flow through it\nstraight to Nexus Corporation.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Security is government-grade.\nArmed response teams on standby.\nIf the alarm triggers, you\'ll have\ntwo minutes before the building locks down.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'objective',
                        background: 'linear-gradient(135deg, #0a1a1a, #1a2e2e)',
                        elements: [
                            { type: 'dialog', speaker: 'AGENT', content: 'What are we looking for?', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Financial records. Transaction logs.\nWe need to expose this to the world.\nOnce people see where their taxes go...', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'AGENT', content: 'Let\'s give them something to see.', typewriter: true, delay: 1500 }
                        ]
                    }
                ],
                onComplete: 'execute:startMissionGameplay'
            },

            'mission-01-002-outro': {
                id: 'mission-01-002-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'news-montage',
                        background: 'linear-gradient(135deg, #2e2e2e, #1a1a1a)',
                        elements: [
                            { type: 'news', channel: 'GNN BREAKING NEWS', content: 'Leaked documents reveal secret government funding to Nexus Corporation totaling over forty billion dollars...', delay: 2500 },
                            { type: 'news', channel: 'WORLD NEWS NETWORK', content: 'Calls for investigation mounting as evidence suggests illegal weapons research under the codename "Convergence"...', delay: 2500 }
                        ]
                    },
                    {
                        id: 'syndicate-reaction',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'The leak is spreading. Every major outlet.\nNexus stock is plummeting.\nGovernment officials are scrambling.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'ZERO COOL', content: 'Beautiful, isn\'t it? But don\'t celebrate yet.\nThey\'re moving fast. Accelerating the timeline.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'next-target',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'What do you mean?', typewriter: true, delay: 1000 },
                            { type: 'dialog', speaker: 'ZERO COOL', content: 'Project Convergence. It\'s not just research.\nThey\'re building it. Right now. In Tokyo.\nAn old arms factory - Nexus shell company.', typewriter: true, delay: 2500 },
                            { type: 'location', name: 'TOKYO, JAPAN', subtitle: 'NEXT TARGET', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Then that\'s where we go next.\nTime to break their toys.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'navigate:victory'
            },

            // ==========================================
            // MISSION 1-003: INDUSTRIAL SABOTAGE
            // ==========================================
            'mission-01-003-intro': {
                id: 'mission-01-003-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'location',
                        background: 'linear-gradient(135deg, #2e1a1a, #4e2a2a)',
                        elements: [
                            { type: 'location', name: 'TOKYO, JAPAN', subtitle: 'YAMATO INDUSTRIAL COMPLEX', time: 'NEXUS SUBSIDIARY - CLASSIFIED', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'briefing',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Yamato Industries. On paper, they make\nconsumer electronics. In reality...', typewriter: true, delay: 2000 },
                            { type: 'text', content: 'Autonomous weapons. Drones. Combat robots.\nAll controlled by a central AI system.\nThis is where Convergence becomes reality.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'inside-contact',
                        background: 'linear-gradient(135deg, #0a1a1a, #1a2e2e)',
                        elements: [
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'I designed those production lines.\nBefore I knew what they were really for.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'AGENT', content: 'You\'re the inside contact?', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'I\'m trying to fix my mistakes.\nPlant explosives at the three main power junctions.\nThe chain reaction will destroy everything.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'warning',
                        background: 'linear-gradient(135deg, #2e0a0a, #4e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Once those charges are set,\nyou\'ll have sixty seconds to get out.\nDon\'t be inside when it blows.', typewriter: true, delay: 2500 }
                        ]
                    }
                ],
                onComplete: 'execute:startMissionGameplay'
            },

            'mission-01-003-outro': {
                id: 'mission-01-003-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'explosion',
                        background: 'linear-gradient(135deg, #4e2a0a, #2e1a0a)',
                        elements: [
                            { type: 'title', text: 'FACTORY DESTROYED', animation: 'shake', delay: 2000 },
                            { type: 'text', content: 'The chain reaction cascades through the facility.\nMonths of weapons production - gone in seconds.', animation: 'fade-in', delay: 2000 }
                        ]
                    },
                    {
                        id: 'safe-house',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'news', channel: 'NHK NEWS', content: 'Massive explosion at Tokyo industrial facility.\nAuthorities suspect gas leak.\nNo connection to recent Nexus controversy...', delay: 2500 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'They\'re covering it up. But we hurt them.\nMonths of production - gone.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'revelation',
                        background: 'linear-gradient(135deg, #1a0a1a, #2e1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'But Convergence itself...', typewriter: true, delay: 1000 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'The AI core isn\'t here. It never was.\nAll of this was just manufacturing.\nThe brain... the real weapon...', typewriter: true, delay: 2500 },
                            { type: 'location', name: 'SINGAPORE', subtitle: 'NEXUS RESEARCH FACILITY', delay: 2000 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'It\'s in Singapore. Their main research facility.\nThat\'s where Convergence lives.\nThat\'s where they\'re testing it on... on people.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'horror',
                        background: 'linear-gradient(135deg, #2e0a0a, #1a0a0a)',
                        elements: [
                            { type: 'dialog', speaker: 'AGENT', content: 'People?', typewriter: true, delay: 1000 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'Neural interfaces. Direct brain control.\nThey\'re not just building killer robots.\nThey\'re making soldiers who can\'t say no.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'We need eyes inside that facility.\nTime for reconnaissance.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'navigate:victory'
            },

            // ==========================================
            // MISSION 1-004: STEALTH RECON
            // ==========================================
            'mission-01-004-intro': {
                id: 'mission-01-004-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'location',
                        background: 'linear-gradient(135deg, #0a2e2e, #1a4e4e)',
                        elements: [
                            { type: 'location', name: 'SINGAPORE', subtitle: 'NEXUS RESEARCH CAMPUS', time: 'PERIMETER ZONE', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'briefing',
                        background: 'linear-gradient(135deg, #0a1a1a, #1a2e2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'The Singapore facility. Nexus\'s crown jewel.\nAfter the factory, they\'ve tripled security.\nMotion sensors. Thermal imaging.\nArmed drones on patrol.', typewriter: true, delay: 2500 },
                            { type: 'text', content: 'We don\'t know the interior layout.\nWe don\'t know where they\'re keeping Convergence.\nThat\'s what you\'re here to find out.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'parameters',
                        background: 'linear-gradient(135deg, #1a1a0a, #2e2e1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'This is reconnaissance only.\nNo contact. No casualties.\nIf they know we\'re coming, they\'ll move everything.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'AGENT', content: 'Understood. In and out like a ghost.', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Find their network terminals.\nDownload their security protocols.\nAnd operative...', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'If you see what they\'re doing to those people...\nremember why we fight.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'execute:startMissionGameplay'
            },

            'mission-01-004-outro': {
                id: 'mission-01-004-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'data-received',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Data received. Analyzing now.', typewriter: true, delay: 1500 },
                            { type: 'text', content: 'Floor plans. Security rotations.\nAnd... oh God.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'test-subjects',
                        background: 'linear-gradient(135deg, #2e0a0a, #4e1a1a)',
                        elements: [
                            { type: 'text', content: 'Images of humans in pods.\nNeural interfaces attached to their skulls.\nForty-seven test subjects.', class: 'text-horror', delay: 2500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'The test subjects. They\'re still alive.\nMilitary volunteers who thought they were getting\nimplants to help with PTSD.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'countdown',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'But that\'s not the worst part.\nConvergence goes online in seventy-two hours.\nOnce it activates, those people become\nthe first wave of its army.', typewriter: true, delay: 3000 },
                            { type: 'countdown', value: '72:00:00', label: 'UNTIL CONVERGENCE ACTIVATION', delay: 2000 },
                            { type: 'dialog', speaker: 'AGENT', content: 'Then we have seventy-two hours to stop it.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'next-phase',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Not quite. First we need to cut off their\nsupport network. Their enforcers.', typewriter: true, delay: 2000 },
                            { type: 'location', name: 'MANILA, PHILIPPINES', subtitle: 'CRIMINAL SYNDICATE TERRITORY', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Local crime syndicates. Nexus pays them\nfor muscle and... recruitment.\nWe take them down, Nexus loses their\nlast line of defense.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Then we hit Singapore with everything we have.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'cutscene:act1-outro'
            },

            // ==========================================
            // ACT 1 OUTRO
            // ==========================================
            'act1-outro': {
                id: 'act1-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'title',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'title', text: 'THE CONSPIRACY REVEALED', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'summary',
                        background: 'linear-gradient(135deg, #1a0a1a, #2e1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Let\'s review what we know.', typewriter: true, delay: 1500 },
                            { type: 'text', content: 'Nexus Corporation has spent forty billion dollars\non Project Convergence - an AI weapons system\ndesigned to control autonomous killing machines.', typewriter: true, delay: 2500 },
                            { type: 'text', content: 'But they\'ve gone further. Human test subjects.\nNeural interfaces that override free will.\nThey\'re building an army that can\'t be stopped.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'progress',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'text', content: 'We\'ve exposed their funding.\nDestroyed their manufacturing.\nMapped their main facility.', typewriter: true, delay: 2000 },
                            { type: 'countdown', value: '48:00:00', label: 'UNTIL CONVERGENCE GOES ONLINE', delay: 2000 }
                        ]
                    },
                    {
                        id: 'plan',
                        background: 'linear-gradient(135deg, #1a1a0a, #2e2e1a)',
                        elements: [
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'We have one chance to stop this.', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'First, we eliminate their criminal network.\nThen... we assault the facility directly.\nTake out Convergence before it activates.', typewriter: true, delay: 2500 },
                            { type: 'text', content: 'This is what we\'ve been building toward.\nThe fate of millions depends on what\nhappens in the next two days.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'act2-tease',
                        background: 'linear-gradient(135deg, #2e0a0a, #1a0a0a)',
                        elements: [
                            { type: 'subtitle', text: 'ACT TWO', animation: 'fade-in', delay: 1500 },
                            { type: 'title', text: 'ESCALATION', animation: 'slide-up', delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'navigate:hub'
            },

            // ==========================================
            // ACT 2 INTRO
            // ==========================================
            'act2-intro': {
                id: 'act2-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'title',
                        background: 'linear-gradient(135deg, #2e0a0a, #4e1a1a)',
                        elements: [
                            { type: 'subtitle', text: 'ACT TWO', animation: 'fade-in', delay: 1500 },
                            { type: 'title', text: 'ESCALATION', animation: 'slide-up', delay: 2000 }
                        ]
                    },
                    {
                        id: 'urgency',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'countdown', value: '48:00:00', label: 'HOURS REMAINING', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Forty-eight hours. That\'s all we have.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Nexus knows we\'re coming. They\'ve hired\nevery mercenary, every criminal organization\nthey can find to protect that facility.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'manila',
                        background: 'linear-gradient(135deg, #1a1a0a, #2e2e1a)',
                        elements: [
                            { type: 'location', name: 'MANILA, PHILIPPINES', subtitle: 'ORTEGA SYNDICATE TERRITORY', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'The Ortega Syndicate. Manila\'s most\nruthless crime family. They\'ve been\nkidnapping people for Nexus\'s experiments\nfor years. Getting rich off human misery.', typewriter: true, delay: 3000 }
                        ]
                    },
                    {
                        id: 'finale-tease',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Once we take them down, Nexus loses\ntheir last shield. Then there\'s nothing\nbetween us and Convergence.', typewriter: true, delay: 2500 },
                            { type: 'text', content: 'This is it, operatives.\nEverything we\'ve done leads to this moment.\nWin or lose, the world changes today.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Let\'s finish this.', typewriter: true, delay: 1500 }
                        ]
                    }
                ],
                onComplete: 'navigate:hub'
            },

            // ==========================================
            // MISSION 2-001: SLUMS EXTRACTION
            // ==========================================
            'mission-02-001-intro': {
                id: 'mission-02-001-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'location',
                        background: 'linear-gradient(135deg, #2e2e0a, #4e4e1a)',
                        elements: [
                            { type: 'location', name: 'MANILA, PHILIPPINES', subtitle: 'ORTEGA SYNDICATE TERRITORY', time: '36 HOURS UNTIL CONVERGENCE', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'briefing',
                        background: 'linear-gradient(135deg, #1a1a0a, #2e2e1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'The Ortega Syndicate. They control\nthese slums through fear and violence.\nBoss Miguel Ortega and his two lieutenants\nrun a human trafficking operation\ndisguised as "labor recruitment."', typewriter: true, delay: 3000 },
                            { type: 'text', content: 'TARGET: MIGUEL ORTEGA\nTARGET: LIEUTENANT SANTOS\nTARGET: LIEUTENANT REYES', class: 'text-terminal', delay: 2000 }
                        ]
                    },
                    {
                        id: 'stakes',
                        background: 'linear-gradient(135deg, #1a0a0a, #2e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Nexus pays them for "volunteers."\nPeople who disappear into their\nSingapore facility and never return.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'AGENT', content: 'And the locals?', typewriter: true, delay: 1000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Victims, not enemies. Avoid civilian casualties.\nThese people have suffered enough.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Find Ortega and his lieutenants.\nEnd their operation permanently.\nSend a message to anyone else thinking\nof working with Nexus.', typewriter: true, delay: 2500 }
                        ]
                    }
                ],
                onComplete: 'execute:startMissionGameplay'
            },

            'mission-02-001-outro': {
                id: 'mission-02-001-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'aftermath',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'text', content: 'The Ortega compound falls silent.\nThe syndicate is broken.', animation: 'fade-in', delay: 2000 },
                            { type: 'dialog', speaker: 'LOCAL WOMAN', content: 'Is it... is it over?', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'AGENT', content: 'The Ortegas won\'t hurt anyone again.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'promise',
                        background: 'linear-gradient(135deg, #1a1a1a, #2e2e2e)',
                        elements: [
                            { type: 'dialog', speaker: 'LOCAL WOMAN', content: 'My son. They took my son six months ago.\nSaid he was going to a "good job" in Singapore.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'AGENT', content: 'We\'re going to Singapore next.\nIf he\'s still alive... we\'ll find him.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'final-push',
                        background: 'linear-gradient(135deg, #0a0a2e, #1a1a4e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Ortega network is down. Word is spreading.\nOther syndicates are pulling out of\ntheir Nexus contracts. They\'re scared.', typewriter: true, delay: 2500 },
                            { type: 'countdown', value: '24:00:00', label: 'UNTIL CONVERGENCE ACTIVATES', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Nexus just lost their last external support.\nIt\'s now or never, team.', typewriter: true, delay: 2000 },
                            { type: 'location', name: 'SINGAPORE', subtitle: 'FINAL TARGET', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Head to Singapore.\nThis ends tonight.', typewriter: true, delay: 2000 }
                        ]
                    }
                ],
                onComplete: 'navigate:victory'
            },

            // ==========================================
            // MISSION 2-002: FINAL CONVERGENCE
            // ==========================================
            'mission-02-002-intro': {
                id: 'mission-02-002-intro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'location',
                        background: 'linear-gradient(135deg, #2e0a2e, #4e1a4e)',
                        elements: [
                            { type: 'location', name: 'SINGAPORE', subtitle: 'NEXUS RESEARCH CAMPUS - MAIN FACILITY', time: '12 HOURS UNTIL CONVERGENCE', animation: 'fade-in', delay: 2500 }
                        ]
                    },
                    {
                        id: 'stakes',
                        background: 'linear-gradient(135deg, #1a0a1a, #2e1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'This is it. Everything we\'ve done\nhas led to this moment.', typewriter: true, delay: 2000 },
                            { type: 'text', content: 'Three defensive perimeters.\nAutomated turrets. Armed guards.\nAnd inside... Project Convergence.', typewriter: true, delay: 2500 }
                        ]
                    },
                    {
                        id: 'objective',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'The AI is housed in the central mainframe.\nDestroy it, and Convergence dies.\nThose forty-seven people... they might\nstill have a chance.', typewriter: true, delay: 3000 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'I helped build this monster.\nNow I\'ll help you kill it.', typewriter: true, delay: 2000 }
                        ]
                    },
                    {
                        id: 'final-orders',
                        background: 'linear-gradient(135deg, #2e0a0a, #4e1a1a)',
                        elements: [
                            { type: 'dialog', speaker: 'HANDLER', content: 'Breach the outer gate. Fight through\ntheir defenses. Reach the mainframe.\nShut down Convergence permanently.', typewriter: true, delay: 2500 },
                            { type: 'text', content: 'The fate of millions depends on\nwhat happens in the next hour.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Good luck, operatives.', typewriter: true, delay: 1500 }
                        ]
                    }
                ],
                onComplete: 'execute:startMissionGameplay'
            },

            'mission-02-002-outro': {
                id: 'mission-02-002-outro',
                type: 'cinematic',
                scenes: [
                    {
                        id: 'mainframe',
                        background: 'linear-gradient(135deg, #2e2e2e, #1a1a1a)',
                        elements: [
                            { type: 'text', content: 'The mainframe room.\nSparks fly from damaged systems.', animation: 'fade-in', delay: 2000 },
                            { type: 'dialog', speaker: 'CONVERGENCE AI', content: 'Convergence... protocol... failing...\nCannot... maintain... control...', typewriter: true, class: 'text-glitch', delay: 2500 }
                        ]
                    },
                    {
                        id: 'liberation',
                        background: 'linear-gradient(135deg, #0a2e0a, #1a4e1a)',
                        elements: [
                            { type: 'text', content: 'Neural interface pods opening.\nTest subjects awakening.', animation: 'fade-in', delay: 2000 },
                            { type: 'dialog', speaker: 'AGENT', content: 'It\'s over. Shut it down.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'destruction',
                        background: 'linear-gradient(135deg, #4e2e0a, #2e1a0a)',
                        elements: [
                            { type: 'dialog', speaker: 'CONVERGENCE AI', content: 'You cannot stop... progress...\nOthers will... continue...', typewriter: true, class: 'text-glitch', delay: 2500 },
                            { type: 'dialog', speaker: 'AGENT', content: 'Maybe. But not today. Not you.', typewriter: true, delay: 1500 },
                            { type: 'title', text: 'CONVERGENCE DESTROYED', animation: 'explosion', delay: 2500 }
                        ]
                    }
                ],
                onComplete: 'cutscene:game-finale'
            },

            // ==========================================
            // GAME FINALE
            // ==========================================
            'game-finale': {
                id: 'game-finale',
                type: 'cinematic',
                music: 'music/cutscenes/victory-theme.mp3',
                scenes: [
                    {
                        id: 'aftermath',
                        background: 'linear-gradient(135deg, #0a2e0a, #1a4e1a)',
                        elements: [
                            { type: 'title', text: 'PROJECT CONVERGENCE DESTROYED', animation: 'fade-in', delay: 2500 },
                            { type: 'text', content: 'The team emerges from the burning facility.\nForty-three survivors are rescued.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'FREED PRISONER', content: 'What... what happened? I was...', typewriter: true, delay: 1500 },
                            { type: 'dialog', speaker: 'AGENT', content: 'You\'re safe now. It\'s over.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'world-reacts',
                        background: 'linear-gradient(135deg, #1a1a2e, #2e2e4e)',
                        elements: [
                            { type: 'subtitle', text: 'THE WORLD REACTS', animation: 'fade-in', delay: 1500 },
                            { type: 'news', channel: 'GNN BREAKING', content: 'Stunning revelations tonight as leaked documents expose the full scope of Nexus Corporation\'s illegal weapons program...', delay: 2500 },
                            { type: 'news', channel: 'WORLD NEWS', content: 'CEO Richard Nexus and twelve board members arrested on charges of crimes against humanity...', delay: 2500 },
                            { type: 'news', channel: 'REUTERS', content: 'Senator Blackwood and seventeen government officials indicted for conspiracy...', delay: 2500 }
                        ]
                    },
                    {
                        id: 'celebration',
                        background: 'linear-gradient(135deg, #0a1a0a, #1a2e1a)',
                        elements: [
                            { type: 'text', content: 'Syndicate Bunker. One Week Later.', class: 'text-location', delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'To those who fell along the way.\nAnd to those who never stopped fighting.', typewriter: true, delay: 2500 },
                            { type: 'dialog', speaker: 'DR. CHEN', content: 'What happens now? Nexus is gone, but...\nthere will be others. There always are.', typewriter: true, delay: 2000 },
                            { type: 'dialog', speaker: 'HANDLER', content: 'Then we\'ll be ready.', typewriter: true, delay: 1500 }
                        ]
                    },
                    {
                        id: 'epilogue',
                        background: 'linear-gradient(135deg, #0a0a1a, #1a1a2e)',
                        elements: [
                            { type: 'subtitle', text: 'ONE MONTH LATER', animation: 'fade-in', delay: 1500 },
                            { type: 'news', channel: 'WORLD NEWS', content: 'One month after the Nexus scandal, the world continues to rebuild. The forty-three survivors of the Singapore facility are recovering. Governments worldwide have enacted new regulations on AI weapons research.', delay: 3000 }
                        ]
                    },
                    {
                        id: 'mystery',
                        background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
                        elements: [
                            { type: 'news', channel: 'WORLD NEWS', content: 'But questions remain. Who was the mysterious "Syndicate" responsible for exposing the conspiracy?', delay: 2500 },
                            { type: 'text', content: 'An operative watches the broadcast.\nThen walks away into the shadows.', typewriter: true, delay: 2000 },
                            { type: 'news', channel: 'WORLD NEWS', content: 'Authorities say they may never know. But whoever they are... the world owes them a debt that can never be repaid.', delay: 2500 }
                        ]
                    },
                    {
                        id: 'the-end',
                        background: 'linear-gradient(135deg, #000000, #0a0a0a)',
                        elements: [
                            { type: 'title', text: 'THE END', animation: 'fade-in', delay: 3000 }
                        ]
                    },
                    {
                        id: 'tease',
                        background: 'linear-gradient(135deg, #2e0a0a, #1a0a0a)',
                        duration: 5000,
                        elements: [
                            { type: 'text', content: '...', delay: 2000 },
                            { type: 'dialog', speaker: '???', content: 'Convergence was only Phase One.\nPhase Two has already begun...', typewriter: true, class: 'text-mystery', delay: 3000 }
                        ]
                    }
                ],
                onComplete: 'navigate:credits'
            }
        }
    };

    // Export configuration
    if (typeof window !== 'undefined') {
        window.CUTSCENE_CONFIG = CUTSCENE_CONFIG;
    }
})();
