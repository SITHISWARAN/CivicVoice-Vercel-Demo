/**
 * Curated fictional records used only to make the student demo navigable.
 * They are not reports from residents and must never be presented as official cases.
 * reportedDaysAgo controls the demo timeline; durationDays describes the fictional issue.
 */
export const DEMO_CASES = Object.freeze([
  { category: 'Water supply', area: 'T. Nagar', description: 'The morning water supply has been very low for the last two days.', durationDays: 2, reportedDaysAgo: 1, status: 'Received' },
  { category: 'Water leakage', area: 'Velachery', description: 'Water is leaking from a roadside pipe and running along the kerb.', durationDays: 4, reportedDaysAgo: 2, status: 'Awaiting review' },
  { category: 'Water quality', area: 'Adyar', description: 'Tap water looked yellow this morning and had an unusual smell.', durationDays: 1, reportedDaysAgo: 2, status: 'Received' },
  { category: 'Drainage', area: 'Nungambakkam', description: 'Rainwater is draining slowly because the roadside drain appears blocked.', durationDays: 5, reportedDaysAgo: 4, status: 'In progress' },
  { category: 'Open manhole', area: 'Anna Nagar', description: 'A manhole cover is missing near the edge of the pedestrian path.', durationDays: 1, reportedDaysAgo: 1, status: 'Awaiting review', urgency: 'priority review' },
  { category: 'Stormwater flooding', area: 'Mogappair', description: 'Water remained across the junction after the rain and pedestrians had to step into traffic.', durationDays: 2, reportedDaysAgo: 3, status: 'In progress' },
  { category: 'Garbage', area: 'Mylapore', description: 'Several waste bags have been left beside the usual collection point since yesterday.', durationDays: 2, reportedDaysAgo: 1, status: 'Received' },
  { category: 'Pothole', area: 'T. Nagar', description: 'A pothole has widened near the turn and is difficult to see after dark.', durationDays: 12, reportedDaysAgo: 6, status: 'In progress' },
  { category: 'Road damage', area: 'Kilpauk', description: 'Loose road surface and gravel are spreading across one side of the lane.', durationDays: 8, reportedDaysAgo: 7, status: 'Awaiting review' },
  { category: 'Road obstruction', area: 'Adyar', description: 'Building material has been left across part of the road and narrows vehicle access.', durationDays: 2, reportedDaysAgo: 3, status: 'Resolved' },
  { category: 'Road signage', area: 'Mogappair', description: 'The street-name board at the junction is faded and hard to read.', durationDays: 18, reportedDaysAgo: 10, status: 'Awaiting review' },
  { category: 'Illegal parking', area: 'Nungambakkam', description: 'Vehicles are regularly parked over the footpath, leaving little room to walk.', durationDays: 9, reportedDaysAgo: 8, status: 'In progress' },
  { category: 'Footpath damage', area: 'Mylapore', description: 'Two sections of the footpath are uneven and difficult to use with a wheelchair.', durationDays: 14, reportedDaysAgo: 12, status: 'Awaiting review' },
  { category: 'Power outage', area: 'Velachery', description: 'Power has gone off several times in this block since last evening.', durationDays: 1, reportedDaysAgo: 1, status: 'Resolved' },
  { category: 'Traffic signal', area: 'Kilpauk', description: 'The traffic signal is not cycling correctly and vehicles are hesitating at the junction.', durationDays: 3, reportedDaysAgo: 4, status: 'In progress' },
  { category: 'Public toilet', area: 'Mylapore', description: 'The public toilet needs cleaning and the wash area has no running water.', durationDays: 3, reportedDaysAgo: 5, status: 'Awaiting review' },
  { category: 'Mosquito nuisance', area: 'Adyar', description: 'Standing water behind the public bin may be attracting mosquitoes.', durationDays: 10, reportedDaysAgo: 9, status: 'Received' },
  { category: 'Stray animals', area: 'Anna Nagar', description: 'An injured stray dog has been seen near the park entrance since this morning.', durationDays: 1, reportedDaysAgo: 1, status: 'Awaiting review' },
  { category: 'Fallen tree', area: 'Mogappair', description: 'A fallen branch is blocking part of the footpath after the recent wind.', durationDays: 1, reportedDaysAgo: 2, status: 'Resolved' },
  { category: 'Construction debris', area: 'T. Nagar', description: 'Broken tiles and rubble from nearby work are occupying the public footpath.', durationDays: 6, reportedDaysAgo: 5, status: 'Received' },
  { category: 'Illegal dumping', area: 'Nungambakkam', description: 'Mixed construction and household waste has been dumped beside the service lane.', durationDays: 7, reportedDaysAgo: 8, status: 'Awaiting review' },
  { category: 'Air pollution', area: 'Velachery', description: 'Smoke from burning waste is drifting into nearby homes in the evening.', durationDays: 2, reportedDaysAgo: 3, status: 'Received' },
  { category: 'Public transport facility', area: 'Kilpauk', description: 'The bus shelter roof panel is damaged and does not provide much cover during rain.', durationDays: 16, reportedDaysAgo: 14, status: 'In progress' },
  { category: 'Public infrastructure', area: 'Anna Nagar', description: 'A public bench has a loose frame and should be checked before it is used.', durationDays: 4, reportedDaysAgo: 6, status: 'Resolved' },
  { category: 'Noise nuisance', area: 'Adyar', description: 'Loud construction noise has continued after the usual evening rest period.', durationDays: 5, reportedDaysAgo: 7, status: 'Awaiting review' },
  { category: 'Park maintenance', area: 'Mogappair', description: 'Overgrown plants are covering part of the walking path in the neighbourhood park.', durationDays: 20, reportedDaysAgo: 16, status: 'In progress' },
  { category: 'Public safety', area: 'T. Nagar', description: 'A loose electrical cable is hanging close to the public walkway.', durationDays: 1, reportedDaysAgo: 1, status: 'Awaiting review', urgency: 'priority review' },
  { category: 'Other', area: 'Mylapore', description: 'A public notice board has a broken frame and loose pieces around its base.', durationDays: 11, reportedDaysAgo: 12, status: 'Received' },

  // A few additional examples make the common categories less uniform on the map.
  { category: 'Water supply', area: 'Kilpauk', description: 'Water pressure drops sharply during the evening supply window.', durationDays: 6, reportedDaysAgo: 9, status: 'In progress' },
  { category: 'Garbage', area: 'Anna Nagar', description: 'The collection point was missed on two collection days this week.', durationDays: 4, reportedDaysAgo: 5, status: 'Awaiting review' },
  { category: 'Garbage', area: 'Velachery', description: 'Loose waste around the bin is attracting animals and spreading onto the road.', durationDays: 3, reportedDaysAgo: 4, status: 'Resolved' },
  { category: 'Pothole', area: 'Nungambakkam', description: 'A second road depression has appeared near the crossing and is collecting rainwater.', durationDays: 9, reportedDaysAgo: 11, status: 'Awaiting review' },
  { category: 'Drainage', area: 'Adyar', description: 'Wastewater is pooling beside the drain and the smell has become stronger.', durationDays: 3, reportedDaysAgo: 6, status: 'In progress' },
  { category: 'Traffic signal', area: 'T. Nagar', description: 'The pedestrian signal stays red even when the crossing is clear.', durationDays: 2, reportedDaysAgo: 2, status: 'Received' },
  { category: 'Park maintenance', area: 'Mylapore', description: 'One of the public drinking-water taps in the park is broken.', durationDays: 13, reportedDaysAgo: 18, status: 'Resolved' },
  { category: 'Water leakage', area: 'Anna Nagar', description: 'A small leak beside the road has left a patch of standing water.', durationDays: 3, reportedDaysAgo: 7, status: 'Received' },
  { category: 'Illegal parking', area: 'Mogappair', description: 'A parked vehicle is blocking access to the ramp at the pavement edge.', durationDays: 2, reportedDaysAgo: 3, status: 'Resolved' }
]);
