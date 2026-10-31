"""
Generates content/reviews/*.json for the tents in content/tent-reference.json.

Each review's "Poles and parts" section and pole spec rows come from the
reference table, so pole sizes stay identical everywhere on the site.
Hands-on findings are attributed to the owners and testers who reported them.

Run: python3 scripts/build-tent-reviews.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
REF = json.loads((ROOT / "content" / "tent-reference.json").read_text())["tents"]
OUT = ROOT / "content" / "reviews"
TS = "https://www.trailspace.com/gear/the-north-face/"


def ref_for(model):
    for t in REF:
        if t["model"] == model:
            return t
    raise KeyError(model)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def poles_section(model, extra):
    t = ref_for(model)
    short = model.replace("The North Face ", "")
    lines = []
    facts = []
    if t["poleCount"]:
        facts.append(f"**{t['poleCount']} poles**" + (" plus a central aluminum hub" if t["hub"] else ""))
    elif t["hub"]:
        facts.append("**a hubbed pole set** (several legs joined at an aluminum hub)")
    if t["diametersMm"]:
        d = t["diametersMm"]
        facts.append(
            f"**{d[0]} mm** tubing" if len(d) == 1 else "**" + " and ".join(f"{x} mm" for x in d) + "** tubing (thicker and thinner poles in the same set)"
        )
    if t["poleSystem"]:
        facts.append(f"**{t['poleSystem']}**")
    if facts:
        lines.append(f"The {short} uses " + ", ".join(facts) + ".")
    else:
        lines.append(f"Published specs for the {short} don't list its pole count or diameter.")
    if t["confidence"] == "owner":
        lines.append("Some of these figures come from owner reports rather than the published spec sheet.")
    if extra:
        lines.append(extra)
    lines.append(
        "The North Face doesn't publish pole lengths. To match a replacement, lay your pole out straight, measure tip to tip, "
        "count the sections, and read the diameter printed near a joint (or use calipers). "
        f"Then search the {short} in our [pole and parts finder](/poles?model={short.replace(' ', '%20')}), "
        "compare against measured stock in the [pole size chart](/poles/sizes), or search by measurement in "
        "[find a pole by size](/poles/size)."
    )
    return "## Poles and parts\n\n" + "\n\n".join(lines)


def pole_spec_rows(model):
    t = ref_for(model)
    rows = []
    if t["poleCount"] or t["hub"]:
        rows.append({"label": "Poles", "value": (f"{t['poleCount']}" if t["poleCount"] else "Hubbed set") + (" + hub" if t["hub"] and t["poleCount"] else "")})
    if t["diametersMm"]:
        rows.append({"label": "Pole diameter", "value": " / ".join(f"{d} mm" for d in t["diametersMm"])})
    if t["poleSystem"]:
        rows.append({"label": "Pole system", "value": t["poleSystem"]})
    return rows


TENTS = [
    {
        "model": "The North Face 2-Meter Dome",
        "title": "The North Face 2-Meter Dome review: an expedition basecamp you can stand up in",
        "dek": "A 4-season, eight-person geodesic dome built on twelve 11 mm Easton poles. It's a room, a kitchen and a storm shelter in one, and it weighs about 50 pounds.",
        "verdict": "The 2-Meter Dome is a true expedition basecamp: huge, stand-up headroom, heavy fabrics and a twelve-pole geodesic frame. Owners treat it as a living room for weeks at a time. It's far too heavy to carry, and the roof vent design frustrates some owners, so it only makes sense for vehicle-supported or stationary camps.",
        "bestFor": "Expedition and research basecamps, long stays in one spot, group cooking and gathering space in cold or stormy places.",
        "notFor": "Anything you carry on your back, quick overnight trips, or campers who don't want a two-person, manual-in-hand setup.",
        "pros": [
            "About 167 sq ft of floor with full standing height",
            "Twelve 11 mm Easton 7075-E9 aluminum poles in a geodesic frame",
            "Heavy 210-denier canopy and 420-denier floor",
            "Chimney vent, two windows and two doors",
            "Owners report it handles a reasonable snow load",
        ],
        "cons": [
            "Around 50 lb, so it lives in a truck or a basecamp",
            "Setup is slow and confusing without the manual, and needs two people",
            "Roof vent design lets water pool or bugs in, depending on how it's propped",
            "Very expensive new",
        ],
        "specs": [
            {"label": "Capacity", "value": "8 people"},
            {"label": "Season", "value": "4-season"},
            {"label": "Floor area", "value": "166.8 sq ft"},
            {"label": "Interior height", "value": "83 in (retailer listing)"},
            {"label": "Weight", "value": "About 50 lb (listings range 47 to 50 lb)"},
            {"label": "Canopy", "value": "210-denier nylon"},
            {"label": "Floor", "value": "420-denier nylon, 10,000 mm coating"},
            {"label": "Doors", "value": "2"},
        ],
        "sections": [
            ("The short version", "The 2-Meter Dome replaced The North Face Dome 8 as the brand's biggest expedition tent. It's a four-season geodesic dome that sleeps eight, with about 167 square feet of floor and enough height that owners describe standing fully upright inside. One professional climber reviewing it on Trailspace used it for two months as his living room, bedroom, kitchen and art studio.\n\nThat tells you who it's for. This is basecamp infrastructure, not a tent you pitch for a night and pack the next morning."),
            ("Space and layout", "Owners consistently call it roomy, with one describing it as basically a full-sized room. Two zippered doors, two exterior windows, a chimney vent and interior canopy loops make it practical for long stays. There's even a stove hole in the floor for a properly vented basecamp stove setup."),
            ("Strength and weather", "The frame is twelve 11 mm Easton 7075-E9 aluminum poles crossing in a geodesic pattern, which spreads wind and snow load across many intersections. Owners say it tolerates a reasonable snow load, and they describe the fabrics as heavy-duty, with one comparing the 420-denier floor to backpack-grade Cordura.\n\nThe common complaint is the roof vent. Without its aluminum prop pole, water can pool on the fly. With the pole in, the top screen stays open and lets bugs in. One owner called it a major oversight."),
            ("Setup", "Expect a learning curve. One owner who had pitched it before had it up in under 30 minutes. Another said one-person setup is impossible, two-person setup is difficult, and the pole sequence isn't intuitive, so keep the manual with the tent. Practice at home before you need it in weather."),
            ("Weight", "At roughly 50 pounds it's vehicle-supported or helicopter-supported gear. Plan on carrying it in more than one load if there's any walk from the truck."),
            ("Bottom line", "If you need a durable, stand-up group shelter for weeks in cold or stormy places, the 2-Meter Dome is one of the most serious tents ever sold for that job. For anything shorter or lighter, it's overkill."),
        ],
        "poleNote": "Because the poles all cross each other, a single bent or snapped pole changes the shape of the whole dome. Replace a damaged pole rather than splinting it for long stays.",
        "sources": [
            {"title": "Trailspace: The North Face 2-Meter Dome", "url": TS + "2-meter-dome/"},
            {"title": "Backcountry: The North Face 2-Meter Dome Tent", "url": "https://www.backcountry.com/the-north-face-2-meter-dome-tent-8-person-4-season"},
        ],
    },
    {
        "model": "The North Face Dome 8",
        "title": "The North Face Dome 8 review: the hub-pole storm dome before the 2-Meter Dome",
        "dek": "An eight-person, four-season dome with a ring-shaped aluminum hub, three double doors and an 83-inch peak. It's slow to pitch and very hard to hurt.",
        "verdict": "The Dome 8 is an overbuilt, stand-up basecamp dome that owners trust in severe storms. Its hub-and-pole frame and many inner-tent connectors make setup slow, and it was replaced by the 2-Meter Dome. A used one in good shape is still a serious group shelter.",
        "bestFor": "Group basecamps, long stays in severe weather, campers who want full standing room.",
        "notFor": "Beginners, solo setup, or ordinary campground trips where a lighter tent would do.",
        "pros": [
            "Owner reports it stayed dry and intact in 80+ mph winds and hail",
            "83 in peak and about 128 sq ft of floor",
            "Three double doors and a 34 sq ft vestibule",
            "Ring-shaped aluminum hub simplifies the frame",
        ],
        "cons": [
            "Owner reports about 1.5 hours to pitch the first time",
            "Many small inner-tent connectors and a confusing manual",
            "Heavy, with a 35 lb packed weight",
            "Discontinued, so parts come from surplus stock",
        ],
        "specs": [
            {"label": "Capacity", "value": "8 people"},
            {"label": "Season", "value": "4-season"},
            {"label": "Floor area", "value": "128 sq ft"},
            {"label": "Peak height", "value": "83 in"},
            {"label": "Doors", "value": "3 double doors"},
            {"label": "Vestibule", "value": "1, 34 sq ft"},
            {"label": "Packed weight", "value": "35 lb"},
            {"label": "Status", "value": "Discontinued, replaced by the 2-Meter Dome"},
        ],
        "sections": [
            ("The short version", "The Dome 8 was The North Face's eight-person, four-season basecamp dome before the 2-Meter Dome replaced it. It stands 83 inches at the peak, covers about 128 square feet, and has three double doors plus a 34-square-foot vestibule. The frame uses DAC poles joined by a ring-shaped aluminum hub."),
            ("Weather", "The owner review on Trailspace is the kind you want for a storm tent. During an Oklahoma thunderstorm with winds over 80 mph, dime-sized hail and nearly four inches of rain in an hour, the owner stayed dry and the tent came through without damage. Their description: bulletproof, and overbuilt for typical U.S. camping."),
            ("Setup", "The same owner is just as clear about setup: about an hour and a half the first time, with two people. The inner tent hangs from many small connectors, some poles had to be redone despite the color coding, and they found the manual poor. Once you've learned it, it goes faster, but this isn't a tent for beginners or for pitching alone."),
            ("Who it suits now", "With full standing height and three doors, the Dome 8 is comfortable for older campers and big groups who want room to move. It shines on long basecamp stays and in places where storms are a real threat."),
            ("Bottom line", "A used Dome 8 is a lot of storm tent for the money. Budget time to learn the pitch, and check the hub, pole ends and inner-tent connectors before you buy."),
        ],
        "poleNote": "The hub is the heart of the frame. If you're buying a used Dome 8, check that the hub isn't cracked and that every pole leg seats fully into it.",
        "sources": [{"title": "Trailspace: The North Face Dome 8", "url": TS + "dome-8/"}],
    },
    {
        "model": "The North Face Dome 5",
        "title": "The North Face Dome 5 review: a five-person hub dome built for snow",
        "dek": "A four-season, five-person dome with a ring-shaped aluminum hub, three large doors and snow skirts. Here's what The North Face built into it, and what it weighs.",
        "verdict": "The Dome 5 shrinks the big-dome idea to five people: a DAC frame with a ring-shaped aluminum hub, snow skirts, three big doors and a removable vestibule. At about 18 pounds it's a basecamp or sled-hauled tent. There are few owner reviews, so treat the claims below as the manufacturer's.",
        "bestFor": "Small expedition teams, snow camping with a sled or vehicle, basecamps in wind and snow.",
        "notFor": "Backpacking, summer car camping, or anyone wanting a quick, simple pitch.",
        "pros": [
            "Ring-shaped aluminum hub reduces the number of poles",
            "Three large double doors sized for expedition packs",
            "Snow flaps, a snow skirt and a port window",
            "About 136 sq ft of floor for five",
        ],
        "cons": [
            "About 18 lb trail weight",
            "Few independent owner reviews",
            "Published fabric specs disagree between listings",
            "Expensive new",
        ],
        "specs": [
            {"label": "Capacity", "value": "5 people"},
            {"label": "Season", "value": "4-season"},
            {"label": "Floor area", "value": "136 sq ft"},
            {"label": "Trail weight", "value": "18 lb 1 oz"},
            {"label": "Total weight", "value": "22 lb 2 oz"},
            {"label": "Doors", "value": "3 double doors"},
            {"label": "Vestibule", "value": "1, removable"},
        ],
        "sections": [
            ("The short version", "The Dome 5 is a five-person, four-season dome that The North Face describes as made for Alaskan backcountry adventure. It uses a DAC pole system joined by a ring-shaped aluminum hub, which cuts the number of separate poles while keeping the frame stable. There are few owner reviews online, so most of what follows is the manufacturer's description."),
            ("Built for snow", "External snow flaps and a snow skirt seal the base against blowing snow. Lift vents are meant to channel wind and reduce flapping, and a polyurethane port window, cold-tested to -60°F, lets you check the weather without opening a door."),
            ("Doors and layout", "Three large double doors are sized for expedition packs, and a removable vestibule can go on the sunny side. The canopy hangs inside the fly and is color-coded, and the fly attaches with a mix of sleeves and clips that The North Face calls Fusion pitch."),
            ("Weight", "Trail weight is about 18 pounds and total weight about 22. That's light for five people in a four-season shelter but heavy for any one person to carry, so plan on splitting it up or hauling it."),
            ("A note on specs", "Listings disagree on the fabrics: one gives a 70-denier canopy and 1,500 mm fly coating, the spec table a 40-denier canopy and 1,200 mm coating. If those numbers matter for your use, check the tag on the tent you're buying."),
            ("Bottom line", "The Dome 5 is a purpose-built snow and wind basecamp for small teams. If you need that, it's a capable design. If you don't, it's a lot of tent to haul."),
        ],
        "poleNote": "As with the Dome 8, inspect the aluminum hub and every leg socket on a used Dome 5. A cracked hub is the one part that's hard to improvise around.",
        "sources": [{"title": "Trailspace: The North Face Dome 5", "url": TS + "dome-5/"}],
    },
    {
        "model": "The North Face Mountain 25",
        "title": "The North Face Mountain 25 review: the two-person four-season tent owners keep for 15 years",
        "dek": "A bombproof two-person mountain tent with DAC Featherlite NSL poles. Owners report it barely moving in 75–85 mph winds. It's heavy and slow to pitch.",
        "verdict": "The Mountain 25 is one of the most trusted two-person four-season tents: owners describe it as bombproof in gales and heavy snow, and many have used theirs for 10 to 15 years. The trade-offs are weight, a slow pitch with cold hands, and a warm interior in summer.",
        "bestFor": "Winter camping, high-alpine and mountaineering trips, anyone who wants one tent for the worst weather they'll see.",
        "notFor": "Three-season backpacking, ultralight trips, and hot summer nights.",
        "pros": [
            "Owner at 12,000 ft reports it barely moved in 75–85 mph winds",
            "Owners report 10–15+ years of use",
            "Two doors with vestibules good for cooking and gear",
            "Room for two six-footers and their gear",
        ],
        "cons": [
            "Heavy, about 8 lb 13 oz trail weight",
            "Slow, fiddly pitch with numb hands; easier with two people",
            "Too warm and poorly breathing for summer",
            "Some owners report tears at pole guides or snapped pole joints",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "4-season"},
            {"label": "Floor area", "value": "29.3 sq ft"},
            {"label": "Trail weight", "value": "8 lb 13 oz"},
            {"label": "Total weight", "value": "9 lb 13 oz"},
            {"label": "Doors", "value": "2, with vestibules"},
        ],
        "sections": [
            ("The short version", "The Mountain 25 replaced The North Face's original Mountain tent and has been in the line, in updated forms, for decades. It's a two-person, four-season tent with DAC Featherlite NSL aluminum poles, and its reputation comes from owners: reviewers on Trailspace call it bombproof, and several have used theirs for 10 to 15 years or more."),
            ("Wind and snow", "This is where it earns its reputation. Most owners report excellent performance in gales, blizzards and heavy snow. One camped at 12,000 feet in 75 to 85 mph winds and said it barely moved. The caveat is pitching in that wind: several owners say it's hard to get up in a strong blow, especially alone."),
            ("Condensation and warmth", "Owners disagree here. Several report staying dry with no condensation, even in frost and heavy rain. Others say it breathes poorly and is too warm for summer. Two mesh doors and roof vents help. One owner notes the floor isn't fully waterproof in slushy spring or autumn snow, so a footprint is worth it."),
            ("Setup", "Expect five to six aluminum poles through fly sleeves, and about 20 minutes once you know it. Owners call it slow and fiddly with numb hands, and cold can stiffen the shock cord. Two people make it much easier."),
            ("Space", "Owners describe room for two six-foot people plus gear, with good pockets. The two vestibules are praised for cooking and storage, though some wish they were bigger and want a spindrift collar."),
            ("Bottom line", "If your trips include real winter or above-treeline weather, the Mountain 25 is a proven choice that lasts. For three-season trips it's more tent, and more weight, than you need."),
        ],
        "poleNote": "One owner reported repeatedly snapping aluminum pole joints, and the frame relies on every pole being sound in high wind. Check each ferrule for cracks before a winter trip, and carry a repair sleeve.",
        "sources": [{"title": "Trailspace: The North Face Mountain 25", "url": TS + "mountain-25/"}],
    },
    {
        "model": "The North Face Minibus 23",
        "title": "The North Face Minibus 23 review: steep walls from reverse-combi poles",
        "dek": "A freestanding two-person, three-season tent with four DAC Featherlite poles, two doors and two vestibules. Here's how its pole layout buys headroom.",
        "verdict": "The Minibus 23 is a freestanding two-door backpacking tent whose reverse-combi poles (thicker across the top, thinner down the sides) make the walls steeper for more headroom. There are few owner reviews online, so this is based on the published design. It's a sensible used buy for two if the fly and floor coatings are still sound.",
        "bestFor": "Two backpackers who want two doors and two vestibules in a freestanding tent.",
        "notFor": "Anyone who needs proven four-season performance or an ultralight pack weight.",
        "pros": [
            "Two doors and two vestibules (20 sq ft combined)",
            "Reverse-combi poles give steeper walls and more headroom",
            "70-denier floor with 5,000 mm coating",
            "Freestanding, with a fast-pitch option",
        ],
        "cons": [
            "Few independent owner reviews",
            "5 lb 6 oz trail weight is heavy by current standards",
            "39.5 in interior height is low for sitting two tall people",
            "Discontinued",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor", "value": "84 × 50 in, 33.3 sq ft"},
            {"label": "Interior height", "value": "39.5 in"},
            {"label": "Trail weight", "value": "5 lb 6 oz"},
            {"label": "Vestibules", "value": "2, 20 sq ft combined"},
            {"label": "Floor fabric", "value": "70-denier nylon taffeta, 5,000 mm PU"},
        ],
        "sections": [
            ("The short version", "The Minibus 23 is a freestanding two-person, three-season tent with two doors and two vestibules. Its standout design choice is the poles: a reverse-combi layout with thicker poles across the top and thinner poles down the sides, which pulls the walls steeper and adds headroom. There are few owner reviews online, so this guide is built from the published design and specs."),
            ("Space", "The floor is 84 by 50 inches, about 33 square feet, with a 39.5-inch interior height. That fits two standard pads side by side, and the steep walls keep the fabric off your face. The two vestibules total about 20 square feet, enough to keep packs and wet boots out of the sleeping area."),
            ("Materials and weather", "The fly is PU-coated ripstop nylon with DWR, and the bathtub floor is 70-denier nylon taffeta with a 5,000 mm coating and fully taped seams. Those are solid three-season numbers. On any used Minibus, check the fly coating and seam tape: older North Face flies from this era can turn sticky or peel."),
            ("Setup", "It's freestanding with clips, so it pitches quickly and can be moved after it's up. It also supports a fast pitch using the fly, poles and footprint without the inner tent."),
            ("Bottom line", "The Minibus 23 is a well-designed two-door tent for two backpackers. Buy used on condition, and keep the four poles together as a matched set, since the top and side poles differ."),
        ],
        "poleNote": "Because the set mixes thicker roof poles with thinner side poles, a replacement has to match both diameter and position. Keep the set together when you pack it.",
        "sources": [{"title": "Backcountry: The North Face Minibus 23", "url": "https://www.backcountry.com/the-north-face-minibus-23-tent-2-person-3-season"}],
    },
    {
        "model": "The North Face Meso 22",
        "title": "The North Face Meso 22 review: a light two-person tent that held in Death Valley wind",
        "dek": "A sub-4-pound, three-pole tent with 8.5 mm DAC Featherlite poles. Owners report it held in 50+ mph gusts. It's best for one person, or two who don't mind closeness.",
        "verdict": "The Meso 22 is a light, compact backpacking tent that owners say is waterproof and wind-stable, including 50+ mph gusts in Death Valley. It fits two snugly and one with room for gear. Add extra stakes, because the fly needs more stake-out points than the tent comes with.",
        "bestFor": "Solo backpackers who want room for gear, or couples comfortable in a snug tent.",
        "notFor": "Two tall adults who want headroom on both sides.",
        "pros": [
            "About 3 lb 12 oz trail weight",
            "Owner reports it held in 50+ mph gusts and rain",
            "Many fly stake points for stability",
            "Packs small enough for a 40 L pack with gear",
        ],
        "cons": [
            "Roof shape gives less headroom on one side",
            "Comes with too few stakes for all the fly points",
            "Gear on the exposed side of the fly needs protecting",
            "Discontinued",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor", "value": "85 × 50.5 in, about 29 sq ft"},
            {"label": "Trail weight", "value": "3 lb 12 oz"},
            {"label": "Total weight", "value": "4 lb 1 oz"},
        ],
        "sections": [
            ("The short version", "The Meso 22 is a light, three-pole, two-person backpacking tent. Its poles are thinner than most North Face tents of the era, at 8.5 mm, which helps keep the trail weight around 3 pounds 12 ounces. Owners on Trailspace describe it as a strong performer for the money."),
            ("Weather", "One owner reports it held up wonderfully in 50+ mph gusts and rain in Death Valley. Both reviewers describe it as waterproof, and the fly has many staking points that keep it stable once they're all used."),
            ("Space", "Opinions depend on who's inside. A 6-foot-2 solo user found plenty of room for gear. A 6-foot-2 owner and his 5-foot-5 wife sleep comfortably in it together at 32°F. The roof design leaves less headroom on one side, and gear stored under the fly on the exposed side needs covering to stay dry."),
            ("Setup and packing", "Owners call it quick to pitch and take down. It packs small enough that one owner fits it in a 40-liter pack with two to four days of gear."),
            ("What to fix", "Owners point out two things: the plastic window in the fly, and too few stakes. The fly needs about four more stake points than the included stakes cover, so bring extras."),
            ("Bottom line", "For solo trips or a couple who don't mind closeness, the Meso 22 is a light, weather-tough tent. Carry extra stakes and you'll get the most out of it."),
        ],
        "poleNote": "At 8.5 mm, Meso poles are thinner than the 9 mm poles used in most North Face tents of the same era, so a 9 mm pole won't be an exact match even if the length is right.",
        "sources": [
            {"title": "Trailspace: The North Face Meso 22", "url": TS + "meso-22/"},
            {"title": "Backcountry: The North Face Meso 22", "url": "https://www.backcountry.com/the-north-face-meso-22-tent-2-person-3-season"},
        ],
    },
    {
        "model": "The North Face Tadpole 23",
        "title": "The North Face Tadpole 23 review: the classic small tent, and what to check on a used one",
        "dek": "A freestanding, three-pole classic with 8.84 mm poles and a big vestibule. Owners report 15 to 30 years of use, and fly coatings that fail on older units.",
        "verdict": "The Tadpole 23 is a beloved, freestanding small tent: easy to pitch, strong in wind and rain, with a vestibule big enough to cook in. It's roomy for one and tight for two, with low headroom. On a used one, the fly coating and seam tape decide whether it's a keeper.",
        "bestFor": "Solo backpackers who want room for gear, or two close partners on short trips.",
        "notFor": "Two tall people, anyone who needs to sit up comfortably, or a used tent with a sticky, peeling fly.",
        "pros": [
            "Owners report it stays dry and stable in heavy rain and wind",
            "Big vestibule for packs, boots and cooking",
            "Fast, freestanding setup, even in the dark",
            "Some owners report 15 to 30 years of use",
        ],
        "cons": [
            "Tight for two, with headroom only near the door",
            "Older flies can turn sticky and lose seam tape",
            "Single door is awkward for two people",
            "Condensation on the fly in cold, damp weather",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "27 sq ft"},
            {"label": "Trail weight", "value": "4 lb 2 oz"},
            {"label": "Total weight", "value": "4 lb 11 oz"},
            {"label": "Status", "value": "Discontinued, replaced by the Tadpole SL 2"},
        ],
        "sections": [
            ("The short version", "The Tadpole 23 is one of the most familiar North Face tents: a freestanding two-person design with three 8.84 mm poles, an all-mesh inner and a big vestibule. Trailspace reviews run from 2004 to today, and the story is consistent. It's strong, simple and loved, and it's cramped for two."),
            ("Weather", "Many owners say it stays dry in heavy rain and handles wind well; one calls it bombproof. The leaks owners do report usually trace back to a poorly staked fly, an unsealed floor, or a fly whose coating has failed with age."),
            ("Space", "Owners describe it as a one-person tent with room for gear, or a two-person tent for close partners. You can sit up only near the door, and people over six feet often find it cramped. The vestibule is the standout: big enough for packs, boots and even cooking."),
            ("Condensation", "The mesh inner ventilates well, but the fly collects condensation in cold, damp weather, especially with two people breathing. Owners recommend staking the fly out wide and cracking the door."),
            ("Buying a used Tadpole", "This is the key point. Several owners report the fly turning sticky and the seam tape flaking after some years, and some say warranty claims were refused. Unfold the fly and check the inside coating before you buy. A Tadpole with a good fly and floor can last decades; one with a failing fly needs a replacement fly."),
            ("Bottom line", "A Tadpole 23 with sound coatings is still a great small tent for one, or two who don't mind closeness. The poles almost never wear out, the coatings do."),
        ],
        "poleNote": "Tadpole 23 poles are listed at 8.84 mm, slightly under the common 9 mm size, so compare diameter carefully when matching a loose pole.",
        "sources": [{"title": "Trailspace: The North Face Tadpole 23", "url": TS + "tadpole-23/"}],
    },
    {
        "model": "The North Face Tadpole 2",
        "title": "The North Face Tadpole 2 review: the lighter, hubbed Tadpole",
        "dek": "The 2014 update moved the Tadpole to hubbed DAC poles and got it under 4 pounds. Owners praise the stiff frame and dislike the small vestibule.",
        "verdict": "The Tadpole 2 swapped the classic Tadpole's three crossing poles for a lighter hubbed DAC frame, and owners say the result is stiff, stable and roomy for one. The vestibule shrank, and it's not a snow tent. It's a good light tent for one person with gear or two who are comfortable sharing.",
        "bestFor": "Solo backpackers, or two compact people on summer trips.",
        "notFor": "Two people with big packs, or trips with snow load.",
        "pros": [
            "Hubbed DAC poles give a stiff, tight pitch",
            "Under 4 lb, lighter than the older Tadpoles",
            "Owner reports it held in 30 mph broadside wind without guylines",
            "Good ventilation from mesh panels and two door vents",
        ],
        "cons": [
            "Small vestibule, about 9 sq ft",
            "Body is freestanding but the fly needs staking",
            "Owners doubt its snow capacity",
            "Discontinued, replaced by the Tadpole SL 2",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Weight", "value": "About 3 lb 15 oz (owner reported)"},
            {"label": "Vestibule", "value": "About 9 sq ft (owner reported)"},
            {"label": "Version", "value": "2014"},
        ],
        "sections": [
            ("The short version", "The Tadpole 2 is the 2014 redesign of the Tadpole. It moved to a hubbed DAC pole frame with thinner, lighter poles, and owners report weights around 3 pounds 15 ounces, well under the older Tadpoles."),
            ("The hubbed frame", "Owners like the change. One calls the pole configuration proven and rock solid, and notes that the front pole tips moved to the top of the tent for more headroom and a lighter pack. Another lists the hubbed poles as a pro on its own."),
            ("Weather", "Wind performance gets high marks. One owner says it held in 30 mph broadside winds without guylines, and another calls it storm proof. One owner was less confident in heavy wind and rain, and another doubts it would handle much snow."),
            ("Space", "Owners disagree, which usually means it depends on the people. One found room for two average adults plus gear under a tall ceiling. Others call it a one-person-plus-gear tent, or two people who are comfortable sharing. The vestibule is the weak point: about 9 square feet, and two 70-liter packs leave only a tiny walkway."),
            ("Bottom line", "The Tadpole 2 is a lighter, stiffer Tadpole that's great for one person and workable for two. Note that the tent body stands on its own, but the fly needs stakes at the sides and foot."),
        ],
        "poleNote": "Because the frame is hubbed, a replacement must be the same hub assembly with the same number of legs. Use the hub assembly option in the size search, count the legs, and measure the longest leg from the center of the hub.",
        "sources": [{"title": "Trailspace: The North Face Tadpole 2", "url": TS + "tadpole-2/"}],
    },
    {
        "model": "The North Face Rock 22",
        "title": "The North Face Rock 22 review: a sturdy two-door tent for solo or couples",
        "dek": "Three 9 mm DAC poles, two doors, two vestibules and a five-minute pitch. Owners say it's tough and good value, with condensation in the cold.",
        "verdict": "The Rock 22 is a sturdy, roomy, good-value two-door tent that owners trust in rain and wind, including 70 mph gusts when fully guyed out. It's heavy for backpacking, collects frost in freezing weather, and the vestibules are small. For car camping or short hikes it's an easy recommendation used.",
        "bestFor": "Solo campers who want room, couples car camping, scouts and families on a budget.",
        "notFor": "Weight-conscious backpackers, or nights well below freezing.",
        "pros": [
            "Owner reports it stood up to 70 mph gusts when staked and guyed",
            "Two doors and two vestibules",
            "Pitches in under five minutes",
            "Durable; many owners have used theirs for years",
        ],
        "cons": [
            "Heavy for backpacking at about 5 lb 4 oz trail weight",
            "Frost and condensation below about 25°F",
            "Small vestibules, and the zipper faces up in rain",
            "Flimsy included stakes",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "34 sq ft"},
            {"label": "Trail weight", "value": "5 lb 4 oz"},
            {"label": "Doors", "value": "2, with 2 vestibules"},
        ],
        "sections": [
            ("The short version", "The Rock 22 is a three-pole, two-door, two-vestibule tent that owners describe as sturdy, roomy and good value. It's been discontinued, but plenty are still in use, and owners mention versions in green-and-beige and salmon-and-beige from around 2007 to 2010."),
            ("Weather", "Many owners say it stayed dry in heavy rain and strong wind, and one reports it standing up to 70 mph gusts once it was staked and guyed out. A few found the fly let water in during hard sideways rain."),
            ("Condensation", "The mesh walls keep it cool on hot nights. In freezing weather, frost and condensation build on the fly and can drip inside. One owner advises against using it below about 25°F."),
            ("Space and setup", "Solo, it's very roomy. Two adults fit, with gear in the vestibules. The gear loft takes some headroom, which taller people notice. Setup takes under five minutes with color-coded clips, though one owner notes the poles can slide at the top without a tie-down."),
            ("Upgrades owners recommend", "Swap the stock stakes, which most owners call flimsy. Watch the vestibule zipper in rain, since it faces up and lets water in when you open it."),
            ("Bottom line", "A used Rock 22 is a tough, easy tent for car camping and short trips. Backpackers chasing low weight will want something lighter."),
        ],
        "poleNote": "The Rock 22 and Rock 32 both use 9 mm poles, but the Rock 32's floor is bigger, so don't assume their poles are interchangeable. Check length and sections.",
        "sources": [{"title": "Trailspace: The North Face Rock 22", "url": TS + "rock-22/"}],
    },
    {
        "model": "The North Face Rock 32",
        "title": "The North Face Rock 32 review: roomy for two, snug for three",
        "dek": "A three-pole, two-door tent with big vestibules and an all-mesh body. Owners love the space and setup, and disagree on waterproofing.",
        "verdict": "The Rock 32 gives two people lots of room, or three people a snug fit, with two doors and large vestibules and a quick, easy pitch. Owners are split on waterproofing and durability, and the floor is thin, so put a footprint under it and check the coatings on a used one.",
        "bestFor": "Two people who want space, or three on summer trips, mostly car camping or short hikes.",
        "notFor": "Cold-weather camping, tall campers over about 6 feet 2, or rough ground without a footprint.",
        "pros": [
            "Roomy for two, with two doors and large vestibules",
            "Pitches in about 5 to 10 minutes, even solo",
            "All-mesh body breathes well and gives a wide view",
            "Good value at sale prices",
        ],
        "cons": [
            "Mixed waterproofing reports; fly can touch the mesh in heavy rain",
            "Thin floor benefits from a footprint",
            "Retains little heat, so it's mainly a summer tent",
            "One 6'3\" owner found it too short",
        ],
        "specs": [
            {"label": "Capacity", "value": "3 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "43.5 sq ft"},
            {"label": "Trail weight", "value": "5 lb 15 oz"},
            {"label": "Total weight", "value": "6 lb 7 oz"},
        ],
        "sections": [
            ("The short version", "The Rock 32 is the three-person version of the Rock: three 9 mm poles, two doors, big vestibules and an all-mesh body. Owners on Trailspace praise the space and the quick pitch, and disagree on how well it keeps out heavy rain."),
            ("Space", "It fits two comfortably, and reviewers call it a snug three-person tent. One owner at 6 foot 3 found it too short."),
            ("Weather", "Many owners stayed dry through heavy, multi-day storms. Others reported leaks, including one whose floor soaked through and one who had to re-waterproof the floor. One owner found the fly touches the mesh walls in heavy rain, which lets water through. Pitch the fly tight and use every guyline."),
            ("Setup and weight", "Most owners say it's up in 5 to 10 minutes, and one person can manage it. At about 5 to 6.5 pounds it's heavy for solo backpacking but manageable when two people split it."),
            ("Durability", "Owners report anything from no tears after five years to expecting major repairs within three. The common thread is the thin floor: use a footprint. The mesh is also easy for animals to damage."),
            ("Bottom line", "For summer trips with two people who want space, the Rock 32 is a comfortable, easy tent. Check the floor and fly coatings on a used one, and add a footprint."),
        ],
        "poleNote": "",
        "sources": [{"title": "Trailspace: The North Face Rock 32", "url": TS + "rock-32/"}],
    },
    {
        "model": "The North Face Spectrum 23",
        "title": "The North Face Spectrum 23 review: light and wind-strong, with a condensation problem",
        "dek": "A 3 lb 12 oz two-person tent with mixed 10.5 mm and 9 mm poles. Owners like the weight and wind stability, and many fought condensation.",
        "verdict": "The Spectrum 23 is light, compact and quick to pitch, and owners say it handles strong wind well. Its big weakness is condensation: many owners woke to water running down the walls or pooling on the floor. It's a better solo tent than a two-person one.",
        "bestFor": "Solo backpackers in dry or breezy climates who want a light, fast tent.",
        "notFor": "Humid or calm conditions, two tall people, or anyone sensitive to a damp morning.",
        "pros": [
            "About 3 lb 12 oz trail weight",
            "Owners report good stability in strong wind",
            "Compact packed size and quick setup",
        ],
        "cons": [
            "Condensation is the most common owner complaint",
            "Floor absorbs moisture; needs a footprint",
            "Cramped for two, or for taller users",
            "Discontinued",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "28 sq ft"},
            {"label": "Trail weight", "value": "3 lb 12 oz"},
            {"label": "Total weight", "value": "4 lb 3 oz"},
        ],
        "sections": [
            ("The short version", "The Spectrum 23 is a light two-person tent with three poles in two sizes, 10.5 mm and 9 mm. Owners on Trailspace like the light weight, small pack size and fast setup, and say it handles strong wind well. It averages middling ratings because of one problem: condensation."),
            ("Condensation", "Several owners woke up to water pooling on the floor and running down the walls, especially when camping solo, in humid conditions or on calm nights. Some found that adjusting the front flaps and vents helped; others found it hard to fix. Owners also report the floor soaking up moisture, so a footprint is a must."),
            ("Space", "Two people fit, but owners call it cramped for two or for taller users. As a solo tent with room for gear, it makes more sense."),
            ("Weather", "Wind is its strength. Owners report it holding well in strong wind, which fits its light, tensioned design."),
            ("Bottom line", "If you camp solo in dry or breezy places, a used Spectrum 23 is a light, capable tent. In humid or still conditions, ventilate aggressively or choose something else."),
        ],
        "poleNote": "The Spectrum's poles come in two diameters, 10.5 mm and 9 mm, so match both the diameter and the length when replacing one.",
        "sources": [{"title": "Trailspace: The North Face Spectrum 23", "url": TS + "spectrum-23/"}],
    },
    {
        "model": "The North Face Vario 23",
        "title": "The North Face Vario 23 review: a fast single-wall tent with an exoskeleton frame",
        "dek": "A 3 lb 15 oz single-wall tent with DAC reverse-combi poles that owners pitch in about a minute. Condensation is the trade-off.",
        "verdict": "The Vario 23 is a light, very fast single-wall tent with a stable exoskeleton-style pole frame. Two people fit and can sit up. Like most single-wall tents, it builds condensation on the inside walls, so keep the vents open.",
        "bestFor": "Two backpackers who value fast setup and low weight, in mostly dry conditions.",
        "notFor": "Humid trips, or campers who hate a damp tent wall.",
        "pros": [
            "Owner timed setup at about 60 seconds",
            "About 3 lb 15 oz trail weight",
            "Stable exoskeleton frame",
            "Owner reports it still waterproof after four years",
        ],
        "cons": [
            "Condensation on interior walls, especially mornings",
            "Vestibules too small to cook in",
            "Stuff sack is about 2 feet long",
            "Discontinued",
        ],
        "specs": [
            {"label": "Capacity", "value": "2 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Construction", "value": "Single-wall"},
            {"label": "Floor area", "value": "32 sq ft"},
            {"label": "Trail weight", "value": "3 lb 15 oz"},
            {"label": "Total weight", "value": "4 lb 5 oz"},
        ],
        "sections": [
            ("The short version", "The Vario 23 is a two-person, single-wall tent with three DAC poles in a reverse-combi layout, mixing 9.6 mm and 9 mm diameters. Owners call it light, quick and durable, and the most common complaint is condensation."),
            ("Setup", "This is its party trick. One owner timed it at about 60 seconds. It uses snaps and a short top pole on an exoskeleton-style frame, and the vestibules need staking to pull the fabric tight."),
            ("Condensation", "Single-wall tents trade weight for breathability, and owners notice. Several report moisture on the interior walls, especially in the morning, even with the top vents. One owner's advice: leave the vents open and you'll be fine."),
            ("Weather and durability", "One owner says it stayed dry through a flooded bog. Another reports it was still waterproof four years later, with no rips or tears."),
            ("Space", "Two people fit comfortably and can sit upright. Both vestibules hold packs and gear but are too small for cooking."),
            ("Bottom line", "If you want a light tent that's up in a minute, the Vario 23 delivers. Manage the vents and accept some condensation on cold, still nights."),
        ],
        "poleNote": "The set mixes 9.6 mm and 9 mm poles. Keep them as a matched set, since each diameter goes in a specific position.",
        "sources": [{"title": "Trailspace: The North Face Vario 23", "url": TS + "vario-23/"}],
    },
    {
        "model": "The North Face Roadrunner 33",
        "title": "The North Face Roadrunner 33 review: a three-person tent with a door and vestibule each",
        "dek": "A three-pole, three-person tent with two doors and two big vestibules. One owner family used it through three days of rain and an early snowfall.",
        "verdict": "The Roadrunner 33 is a roomy three-person backpacking tent with two doors and two large vestibules, mixed 9.6 mm and 9 mm DAC poles, and an all-mesh canopy. The one owner review reports it dry in days of rain, cool in heat and warm in snow. Keep yourself inside the fly's footprint, since the corners can stick out.",
        "bestFor": "Two or three backpackers who want their own door and vestibule space.",
        "notFor": "Ultralight trips, or campers who sprawl to the tent edges in rain.",
        "pros": [
            "Owner reports it dry through three days of constant rain",
            "Two doors and two large vestibules",
            "Mesh canopy keeps it cool with the fly off",
            "Roomy for tall people",
        ],
        "cons": [
            "Sides can extend past the fly, so head and foot ends can get wet",
            "Not the lightest option for two",
            "Few owner reviews",
            "Discontinued",
        ],
        "specs": [
            {"label": "Capacity", "value": "3 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "43.6 sq ft"},
            {"label": "Trail weight", "value": "5 lb 15 oz"},
            {"label": "Total weight", "value": "6 lb 7 oz"},
        ],
        "sections": [
            ("The short version", "The Roadrunner 33 is a three-person, three-season tent with three DAC poles in two diameters, 9.6 mm and 9 mm, two doors and two large vestibules. There's one owner review on Trailspace, from a couple who used it on several multi-day backpacking trips over three years."),
            ("Weather", "They report it kept the inside dry through three days of constant rain in Waterton, and that careful pitching let them set it up in the rain without soaking the interior. With the fly off, the mesh made it cool in hot weather. With the fly on, it kept them warm and dry through a snowfall, though snow can load the fly if the guylines aren't staked out."),
            ("Space and layout", "It sleeps three with plenty of room, and the owner says there's lots of room for tall people. Two doors and two large vestibules give each person their own entrance and gear space, which helps keep the interior dry."),
            ("Watch the edges", "The owner's one warning: the tent's sides can stick out from under the fly, so heads and feet can get wet if you're careless about where you lie."),
            ("Bottom line", "For a couple or a group of three who want doors and vestibules each, the Roadrunner 33 is a comfortable, weatherworthy tent. Listings disagree on whether it has three or four poles and whether they're DAC Press-Fit or Featherlite, so check yours when replacing one."),
        ],
        "poleNote": "One retailer listing gives four poles and DAC Press-Fit; the spec listing gives three. Count your set before you order a replacement.",
        "sources": [{"title": "Trailspace: The North Face Roadrunner 33", "url": TS + "roadrunner-33/"}],
    },
    {
        "model": "The North Face Manta Ray 33",
        "title": "The North Face Manta Ray 33 review: a roomy T-shaped tent that's quiet in wind",
        "dek": "A three-person tent with 8.84 mm DAC Featherlite poles that snap into Jake's Foot sockets. Owners praise its space and stability, and warn about rain when the doors are open.",
        "verdict": "The Manta Ray 33 is a freestanding three-person tent with a T-shaped floor, big vestibules and a gear loft, and owners say it's silent and steady in 40–50 mph wind. The doors let rain in when they're open, and it only comes with half the stakes it needs.",
        "bestFor": "Two people plus gear, or three on summer trips, who want space and a quick pitch.",
        "notFor": "Rainy trips where you'll be in and out often, or minimal-weight backpacking.",
        "pros": [
            "Owner reports no flapping or noise in 40–50 mph wind",
            "Big vestibules, interior wings and a gear loft",
            "Ball-end poles snap into sockets for a fast, solo pitch",
            "Good ventilation; owner reports no condensation problems",
        ],
        "cons": [
            "Rain pours in when the doors are open",
            "Comes with 8 stakes for 16 stake points",
            "Bulky when packed",
            "Discontinued, and footprints are hard to find",
        ],
        "specs": [
            {"label": "Capacity", "value": "3 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor", "value": "92 × 108 in, 51.2 sq ft"},
            {"label": "Interior height", "value": "44 in"},
            {"label": "Trail weight", "value": "6 lb 7 oz"},
            {"label": "Total weight", "value": "6 lb 13 oz"},
        ],
        "sections": [
            ("The short version", "The Manta Ray 33 is a freestanding three-person tent from around 2009 with a T-shaped floor that widens at the head end. Its three DAC Featherlite poles are 8.84 mm, and their ball-shaped ends plug into plastic sockets The North Face called Jake's Foot. Owners rate it highly for space and wind stability."),
            ("Weather", "The main owner review tested it through several rainy weekends and stayed dry, apart from one leak where feet touched the wall. In 40 to 50 mph wind and thunderstorms it had no flapping and no noise. A second owner agrees it's waterproof with the doors closed, but says rain pours in when they're open. Support the door when you go in and out in wet weather."),
            ("Space", "It's rated for three, but owners say it's most comfortable for two with gear. Two large vestibules, interior nightstand wings and a gear loft add storage, and the vestibules fit packs, shoes and even a small dog."),
            ("Setup", "Owners find it fast and easy, even solo and in wind, with color-coded clips and no instructions needed. Getting the clip tension right takes a pitch or two to learn. With 16 stake-out points, it's very stable once fully staked, but it only comes with 8 stakes, and they lack pull loops."),
            ("Bottom line", "A used Manta Ray 33 is a roomy, quiet tent for two or three. Bring 16 stakes and plan your entries in the rain."),
        ],
        "poleNote": "The poles end in balls that seat into Jake's Foot sockets at the corners, so a replacement needs the same ball-end tips as well as the right length and 8.84 mm diameter.",
        "sources": [{"title": "Trailspace: The North Face Manta Ray 33", "url": TS + "manta-ray-33/"}],
    },
    {
        "model": "The North Face Mica 12",
        "title": "The North Face Mica 12 review: a light freestanding solo tent with room for a tall camper",
        "dek": "A two-pole, 9 mm solo tent at 2 lb 12 oz. Its one owner review, from a 6-foot-3 camper, says it fits comfortably.",
        "verdict": "The Mica 12 is a light, freestanding solo tent that pitches easily, even on sand dunes, and its owner review says a 6-foot-3 camper fits comfortably. It has less sitting headroom than some competitors, and there's little storm data, so treat its weather performance as unproven.",
        "bestFor": "Solo backpackers, including taller ones, who want a light freestanding tent.",
        "notFor": "Anyone needing proven storm performance or lots of sitting headroom.",
        "pros": [
            "2 lb 12 oz trail weight",
            "Freestanding and easy to pitch",
            "Fits a 6'3\" camper with a small pack inside",
        ],
        "cons": [
            "Less sitting headroom than some rivals",
            "Little owner data on storm performance",
            "Discontinued",
        ],
        "specs": [
            {"label": "Capacity", "value": "1 person"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "18 sq ft"},
            {"label": "Trail weight", "value": "2 lb 12 oz"},
            {"label": "Total weight", "value": "3 lb 2 oz"},
        ],
        "sections": [
            ("The short version", "The Mica 12 is a freestanding one-person tent with two 9 mm poles and an 18-square-foot floor. Its one owner review on Trailspace is short and positive."),
            ("Space", "The reviewer is 6 foot 3 and 215 pounds and fits comfortably, with enough headroom lying down to keep a small pack inside. Sitting-up room is less than in some competing tents, but he found it adequate."),
            ("Setup", "He describes it as light and easy to pitch, even on the White Sands dunes, without needing the instructions. Being freestanding, it's easy to move after it's up."),
            ("Weather", "The reviewer hadn't been caught in a storm yet, which is why he held back a perfect rating. There's little other owner data, so treat its storm performance as unproven."),
            ("Bottom line", "For a solo backpacker who wants a light freestanding tent with room for a tall body, a used Mica 12 is worth a look. Check the fly coating and seams like any tent from its era."),
        ],
        "poleNote": "",
        "sources": [{"title": "Trailspace: The North Face Mica 12", "url": TS + "mica-12/"}],
    },
    {
        "model": "The North Face Arcus",
        "title": "The North Face Arcus review: sold for two, best for one",
        "dek": "A three-pole DAC Featherlite tent with a pre-bent vestibule pole and a tapered floor. Its detailed owner review calls it a solo tent with elbow room.",
        "verdict": "The Arcus pitches quickly with clip-and-hook pole joints and a pre-bent vestibule pole, and its light fly is pleasant in summer sun. But the tapered floor won't fit two pads, the vestibule is small and high, and it's heavy for what it is. Treat it as a roomy solo tent.",
        "bestFor": "Solo campers, including tall ones, on summer trips.",
        "notFor": "Two people, gear-heavy trips, or weight-conscious backpacking.",
        "pros": [
            "Quick, simple pitch with clip-and-hook pole joints",
            "Light-colored fly reflects sun",
            "Reflective guylines and zipper pulls",
            "Room for a tall solo camper",
        ],
        "cons": [
            "Tapered floor won't fit two 20-inch pads",
            "Small, high vestibule; gear blocks the only door",
            "9 stakes for 12 stake-out points",
            "4 lb 8 oz is heavy for a solo tent",
        ],
        "specs": [
            {"label": "Capacity", "value": "Sold as 2, best for 1"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor", "value": "86 × 48 in, tapered"},
            {"label": "Peak height", "value": "38 in"},
            {"label": "Packed weight", "value": "4 lb 8 oz"},
        ],
        "sections": [
            ("The short version", "The Arcus (listed as the Arcus 23) is a three-pole tent from around 2013 with a coffin-shaped floor that narrows at the foot. Its one detailed owner review on Trailspace sums it up: truly, it's a solo tent, with some elbow room."),
            ("The pole layout", "Two long DAC Featherlite poles cross to form the main dome, and a shorter, pre-bent pole arches over the front vestibule. Small clips and wire-gate hooks join the poles where they cross, so each intersection uses one attachment point. Setup is quick and simple."),
            ("Space", "One tall, broad-shouldered person fits comfortably. Two people don't, even on 20-inch pads, because the floor tapers. You can sit up in only one spot, facing the foot end, toward a solid wall."),
            ("Vestibule and ventilation", "The vestibule is short, sits high off the ground and has one door on the short end, so gear stored there blocks the way in. Ventilation was good with the rear vent and vestibule door open, but with everything sealed overnight, condensation formed under the vestibule. The front vent adjusts only from inside, the rear only from outside."),
            ("Bottom line", "As a solo summer tent with room to stretch, the Arcus works. As a two-person backpacking tent it falls short, and at 4 pounds 8 ounces it's heavy for one."),
        ],
        "poleNote": "The vestibule pole is pre-bent and shorter than the two main poles, so choose the pre-bent option when searching by size for that one.",
        "sources": [{"title": "Trailspace: The North Face Arcus 23", "url": TS + "arcus-23/"}],
    },
    {
        "model": "The North Face Double Headed Toad 44 BX",
        "title": "The North Face Double Headed Toad 44 BX review: a light family tent for summer",
        "dek": "A four-pole, four-person tent at 7 lb 9 oz trail weight. Owners say it fits two adults and two kids, pitches in minutes and handles hard rain.",
        "verdict": "The Double Headed Toad 44 BX is a light four-person tent that owners say fits two adults and two kids, goes up in minutes and holds up in hard rain and wind. Its odd shape and big footprint don't suit every backcountry tent pad, and it's a summer tent, not a snow tent.",
        "bestFor": "Families with young kids, short backpacking trips and summer car camping.",
        "notFor": "Snow, or backcountry sites with small tent platforms.",
        "pros": [
            "Fits two adults and two kids",
            "Owners report quick setup; kids can help pitch it",
            "Owners report it handled hard rain and wind",
            "Light for a four-person tent, 7 lb 9 oz trail weight",
        ],
        "cons": [
            "Footprint can be too big for some backcountry tent platforms",
            "Unusual shape",
            "Best for summer, not snow",
            "Discontinued after the 2011 line",
        ],
        "specs": [
            {"label": "Capacity", "value": "4 people"},
            {"label": "Season", "value": "3-season"},
            {"label": "Floor area", "value": "54 sq ft"},
            {"label": "Trail weight", "value": "7 lb 9 oz"},
            {"label": "Total weight", "value": "8 lb 11 oz"},
        ],
        "sections": [
            ("The short version", "The Double Headed Toad 44 BX is a four-person, four-pole tent with 9 mm poles and a 54-square-foot floor. It was part of The North Face's 2011 line. Owners on Trailspace describe it as a light, easy family tent."),
            ("Space", "Owners say it's roomy enough for two adults and two kids, and light enough to carry on short trips."),
            ("Setup", "Setup is quick and easy. One family says their kids can pitch it in a couple of minutes."),
            ("Weather", "Several owners report it handled hard rain and wind well, and one says condensation isn't an issue. Owners describe it as best for summer; one notes it's not suited to snow."),
            ("Watch out for", "Its footprint can be too big for some backcountry tent platforms, and one owner calls the shape odd. Check the platform sizes where you camp."),
            ("Bottom line", "For a family with young kids, a used Double Headed Toad is a light, quick, weather-capable summer tent."),
        ],
        "poleNote": "",
        "sources": [{"title": "Trailspace: The North Face Double Headed Toad 44 BX", "url": TS + "double-headed-toad-44-bx/"}],
    },
]


def build(t):
    model = t["model"]
    short = model.replace("The North Face ", "")
    body = "\n\n".join(f"## {h}\n\n{p}" for h, p in t["sections"][:-1])
    body += "\n\n" + poles_section(model, t["poleNote"])
    last_h, last_p = t["sections"][-1]
    body += f"\n\n## {last_h}\n\n{last_p}"
    specs = t["specs"] + pole_spec_rows(model)
    # Owners search "north face <model>", so keep the brand and put the model first.
    seo_title = f"North Face {short} Review: Specs, Poles & Fit"
    if len(seo_title) > 60:
        seo_title = f"North Face {short} Review: Specs & Poles"
    return {
        "slug": f"{slug(model)}-review",
        "title": t["title"],
        "dek": t["dek"],
        "subject": model,
        "stockQuery": short,
        "category": "tents",
        "verdict": t["verdict"],
        "bestFor": t["bestFor"],
        "notFor": t["notFor"],
        "pros": t["pros"],
        "cons": t["cons"],
        "specs": specs,
        "body": body,
        "sources": t["sources"],
        "seoTitle": seo_title[:60],
        "seoDescription": (t["dek"][:157] + "...") if len(t["dek"]) > 160 else t["dek"],
        "keywords": [
            f"{short.lower()} review",
            f"north face {short.lower()}",
            f"{short.lower()} replacement pole",
            f"{short.lower()} pole size",
            f"{short.lower()} specs",
            f"north face {short.lower()} tent",
        ],
    }


if __name__ == "__main__":
    for t in TENTS:
        ref_for(t["model"])  # fail fast if the reference row is missing
        a = build(t)
        path = OUT / f"{slug(t['model'])}.json"
        path.write_text(json.dumps(a, indent=2, ensure_ascii=False) + "\n")
        print(f"{path.name}: {len(a['body'].split())} words")
