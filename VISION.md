# Vision for Cluster

Cluster is an absorbing, slow real-time strategy game about galactic conquest through interdependence. Empires need one another’s resources, capabilities, and cooperation to win. Diplomacy is a central game system.

## Experience

Players anticipate rivals’ investments, coordinate distant campaigns, and negotiate over systems whose value depends on who controls them. Betrayal creates memorable moments; lasting cooperation drives victory.

Across repeated games, incentives encourage new alliances and preserve uncertainty, variety, and fairness.

A few core concepts—stars, factions, developments, fleets, and research—create depth through their interactions. Subtypes tune complexity.

## Design

**Stars and factions.** Stars represent territory and access to planetary resources. Four stellar classes—M, G, A, and O—correspond to aquatic, humanoid, insectoid, and reptilian factions. Affinities create complementary strengths and reasons to negotiate.

**Production.** Each development has a base output of one unit per tick:

| Development | Location | Output |
| --- | --- | --- |
| Market (M) | Surface | Galactic credits |
| Training camp (T) | Orbit | Fighters |
| Base (B) | Surface | Infantry |
| Space station (S) | Orbit | Science |

Markets also earn credits from other players’ construction, weighted by the owner’s chosen focus across M/T/B/S. This makes predicting the galaxy’s investment priorities part of economic play.

**Split control.** Orbital control grants fighter and science production; surface control grants infantry production. When different factions hold orbit and surface, credits accumulate locally in escrow. A faction that secures both receives the accumulated credits.

**Fleets and combat.** Fleets carry fighters and infantry through hyperspace. Orbital combat follows Lanchester’s square-law model, making numerical superiority decisive. Ground combat uses linear attrition at constrained access points, with a defender-first advantage.

**Research.** Space stations contribute science to a chosen technology:

| Technology | Effect |
| --- | --- |
| Scanning | Improve the chance of gathering distant system and fleet information |
| Navigation | Extend reachable travel distance |
| Terraforming | Improve system resource extraction |
| Investing | Increase credit income |
| Formations | Improve fighter effectiveness |
| Melee | Increase infantry damage |
| Recruiting | Increase infantry production |
| Innovation | Increase science production |

Sensing probability depends on distance. Navigation adds ten light years of range per level. Terraforming, investing, recruiting, and innovation scale their respective outputs as `output^(1 + level/100)`.

**Victory.** Control of stars or resources measures galactic dominance. Split control, complementary faction strengths, and market prediction make cooperation essential to winning.
