"""
Notion API Direct Update Script — Liza Psychological Profile v2
Workaround for broken notion-update-page MCP tool (upstream serialization bug).

Usage:
    NOTION_TOKEN=ntn_xxx python notion_update_liza_profile.py

Target page: 30cc051d-73d2-8153-9691-ebf7e6614fc7
    Title: Liza — Psychological Profile & Partner Intelligence (v2)
    Page ID: 30cc051d-73d2-81c0-aa96-f674ce22ee6d
"""

import json
import os
import sys
import requests

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
PAGE_ID = "30cc051d-73d2-81c0-aa96-f674ce22ee6d"


def get_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def fetch_page_blocks(token: str, page_id: str) -> list:
    """Fetch all blocks from a page (handles pagination)."""
    headers = get_headers(token)
    blocks = []
    url = f"{NOTION_API_BASE}/blocks/{page_id}/children?page_size=100"

    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        blocks.extend(data.get("results", []))
        if data.get("has_more"):
            cursor = data["next_cursor"]
            url = f"{NOTION_API_BASE}/blocks/{page_id}/children?page_size=100&start_cursor={cursor}"
        else:
            url = None

    return blocks


def find_last_block_id(blocks: list) -> str:
    """Find the last block in the page to append after."""
    if blocks:
        return blocks[-1]["id"]
    return None


def find_section_xii_block(blocks: list) -> str:
    """Find the 'What She's Said That Matters Most' section (Section XII) block ID."""
    for i, block in enumerate(blocks):
        block_type = block.get("type", "")
        if block_type in ("heading_1", "heading_2", "heading_3"):
            text_items = block.get(block_type, {}).get("rich_text", [])
            full_text = "".join(t.get("plain_text", "") for t in text_items)
            if "What She" in full_text and "Said" in full_text:
                return block["id"], i
    return None, None


def find_section_xii_last_child(blocks: list, section_start_idx: int) -> str:
    """Find the last block that belongs to Section XII (before the next section heading)."""
    last_block_id = blocks[section_start_idx]["id"]
    for i in range(section_start_idx + 1, len(blocks)):
        block = blocks[i]
        block_type = block.get("type", "")
        if block_type in ("heading_1",):
            # We've hit the next top-level section, stop here
            text_items = block.get(block_type, {}).get("rich_text", [])
            full_text = "".join(t.get("plain_text", "") for t in text_items)
            # Check if it's a new Roman numeral section
            if any(num in full_text for num in ["XIII", "XIV", "XV"]):
                break
        last_block_id = blocks[i]["id"]
    return last_block_id


def rich_text(content: str, bold: bool = False, italic: bool = False) -> dict:
    """Create a rich_text element."""
    annotations = {
        "bold": bold,
        "italic": italic,
        "strikethrough": False,
        "underline": False,
        "code": False,
        "color": "default",
    }
    return {
        "type": "text",
        "text": {"content": content},
        "annotations": annotations,
    }


def heading_1(text: str) -> dict:
    return {
        "object": "block",
        "type": "heading_1",
        "heading_1": {"rich_text": [rich_text(text)]},
    }


def heading_2(text: str) -> dict:
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {"rich_text": [rich_text(text)]},
    }


def paragraph(*parts) -> dict:
    """Create a paragraph block. Each part is a (text, bold, italic) tuple or just a string."""
    rt = []
    for part in parts:
        if isinstance(part, str):
            rt.append(rich_text(part))
        elif isinstance(part, tuple):
            text_content = part[0]
            bold = part[1] if len(part) > 1 else False
            italic = part[2] if len(part) > 2 else False
            rt.append(rich_text(text_content, bold=bold, italic=italic))
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": rt},
    }


def italic_paragraph(text: str) -> dict:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": [rich_text(text, italic=True)]},
    }


def bold_paragraph(text: str) -> dict:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": [rich_text(text, bold=True)]},
    }


def divider() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def bulleted_list_item(*parts) -> dict:
    rt = []
    for part in parts:
        if isinstance(part, str):
            rt.append(rich_text(part))
        elif isinstance(part, tuple):
            text_content = part[0]
            bold = part[1] if len(part) > 1 else False
            italic = part[2] if len(part) > 2 else False
            rt.append(rich_text(text_content, bold=bold, italic=italic))
    return {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {"rich_text": rt},
    }


def append_blocks(token: str, page_id: str, blocks: list, after_block_id: str = None) -> dict:
    """Append blocks to a page. Notion API appends to end by default."""
    headers = get_headers(token)
    url = f"{NOTION_API_BASE}/blocks/{page_id}/children"

    # Notion API has a limit of 100 blocks per request
    results = []
    for i in range(0, len(blocks), 100):
        chunk = blocks[i : i + 100]
        payload = {"children": chunk}
        if after_block_id:
            payload["after"] = after_block_id
        resp = requests.patch(url, headers=headers, json=payload)
        resp.raise_for_status()
        results.append(resp.json())
        # For subsequent chunks, append after the last block we just added
        if resp.json().get("results"):
            after_block_id = resp.json()["results"][-1]["id"]

    return results


def build_section_xiv_blocks() -> list:
    """Build all the blocks for Section XIV."""
    blocks = [
        divider(),
        heading_1("XIV. Live Behavioral Data \u2014 Feb 19, 2026 (Post-Sleepover)"),
        italic_paragraph("Cross-reference: Behavioral Data Log \u2014 Feb 19, 2026 (30cc051d-73d2-8153-9691-ebf7e6614fc7)"),
        heading_2("What the Night Revealed"),
        paragraph(
            "Date 7: she made dinner, they made out for hours, she asked him to sleep over. "
            "First overnight at her apartment \u2014 she initiated the ask. This is significant "
            "behavioral data for a Scorpio IC woman with betrayal history. The IC does not open casually."
        ),
        paragraph(
            ("Sex stopping pattern (important \u2014 not withdrawal): ", True, False),
            (
                "After hours of intimacy, she stopped physical escalation twice \u2014 once late at night, "
                "once in the morning. Both times she apologized. This is nervous system regulation, not "
                "ambivalence. Maximum exposure reached; she\u2019s managing the pace of her own opening. "
                "Both times James flowed through without friction. Correct. She filed both responses.",
                False,
                False,
            ),
        ),
        paragraph(
            ("Morning data (most unguarded): ", True, False),
            (
                "Roommate home, no performance energy, post-exposure \u2014 she leaned in, cuddled, "
                "kissed for a long time. This is the realest data point to date. No armor available. "
                "She chose closeness anyway.",
                False,
                False,
            ),
        ),
        paragraph(
            ("\u201cThinking anything good?\u201d", True, False),
            (
                " \u2014 asked after stopping sex in the morning, checking whether he was frustrated. "
                "He smiled, said yes, kissed her more. She filed it.",
                False,
                False,
            ),
        ),
        heading_2("The Bad Dating Stories \u2014 Communication Protocol"),
        paragraph(
            "She communicates needs through contrast, not declaration (Mercury in Libra in 2nd). "
            "Every bad dating story is a user manual entry. Log them all:"
        ),
        bulleted_list_item(
            ("\u201cI was seeing a guy recently and he never wanted to stay over and it was a problem\u201d", False, True),
            (" \u2192 said the night James stayed over. Staying over = investment signal she requires.", False, False),
        ),
        bulleted_list_item(
            (
                "\u201cI brought a guy over to meet my friends and he started rubbing my feet in front of them and it was weird\u201d",
                False,
                True,
            ),
            (
                " \u2192 PDA boundary. Public physical display past a certain threshold feels exposing. "
                "Virgo Rising manages appearances carefully.",
                False,
                False,
            ),
        ),
        bulleted_list_item(
            ("Dating is going \u201cawful\u201d", False, True),
            (" \u2014 strong reaction. She knows her pattern and is frustrated by it.", False, False),
        ),
        paragraph(
            ("Instruction: every bad dating story she tells is a direct communication in her native language. ", True, False),
            ("Log them. They compound into a precise map.", True, False),
        ),
        heading_2("The Central Disclosure"),
        italic_paragraph("\u201cI\u2019m always attracted to guys who are emotionally unavailable.\u201d"),
        paragraph(
            "This is the core psychological conflict of her romantic life, handed to James directly. "
            "She knows the pattern consciously. What she doesn\u2019t know yet is whether James is different "
            "or whether this is just the early phase before the catch. Her nervous system has been trained "
            "to expect unavailability; genuine availability is cognitively dissonant. She is rebuilding her "
            "model in real time. This takes repetition and time."
        ),
        paragraph(
            "James asked: ",
            ("\u201cCould you be attracted to someone who is emotionally available?\u201d", False, True),
            (
                " The fact that he\u2019s showing up that way may be actively disorienting her \u2014 "
                "she can\u2019t find the familiar painful pattern. She\u2019s confused by its absence.",
                False,
                False,
            ),
        ),
        heading_2("Updated IC Status"),
        paragraph(
            "Signs opening: asked him to stay (she initiated), morning lean-in (roommate home, no "
            "performance energy), sharing the emotionally unavailable pattern disclosure, checking "
            "his emotional state (\u201cthinking anything good?\u201d)."
        ),
        paragraph(
            "Signs still guarded: entire conversation areas off-limits, communicates needs only "
            "indirectly, paces physical intimacy carefully."
        ),
        paragraph(
            ("Assessment: ", True, False),
            (
                "The IC is moving. It is not open. Early-stage access. The gate is heavy because of "
                "what was destroyed there before (sister/boyfriend betrayal at the foundation level). "
                "Patience is not a strategy \u2014 it\u2019s the only path.",
                False,
                False,
            ),
        ),
        heading_2("One Active Flag"),
        paragraph(
            "James disclosed romantic anxiety to her (\u201cI have trouble reading people, especially "
            "in a romantic context\u201d). Once = honest and human. Do not repeat. She grew up managing "
            "her father\u2019s anxiety and will fatigue if she senses his emotional state is something "
            "she needs to monitor. Bring anxiety here. Bring her presence."
        ),
    ]
    return blocks


def build_section_xii_additions() -> list:
    """Build the blocks to add to Section XII (What She's Said That Matters Most)."""
    blocks = [
        bulleted_list_item(
            ("\u201cI\u2019m always attracted to guys who are emotionally unavailable\u201d", True, False),
            (
                " \u2192 core self-disclosure; she handed him the central wound of her romantic life and watched his face",
                False,
                False,
            ),
        ),
        bulleted_list_item(
            ("\u201cThinking anything good?\u201d", True, False),
            (" (morning after) \u2192 she was checking whether he was frustrated; his response (smile, yes, more kissing) landed and was filed", False, False),
        ),
        bulleted_list_item(
            ("She asked him to stay over", True, False),
            (" \u2192 she initiated; Scorpio IC women do not do this casually", False, False),
        ),
    ]
    return blocks


def verify_update(token: str, page_id: str) -> bool:
    """Verify that Section XIV was added successfully."""
    blocks = fetch_page_blocks(token, page_id)
    found_xiv = False
    found_central_disclosure = False
    for block in blocks:
        block_type = block.get("type", "")
        if block_type in ("heading_1", "heading_2", "heading_3"):
            text_items = block.get(block_type, {}).get("rich_text", [])
            full_text = "".join(t.get("plain_text", "") for t in text_items)
            if "XIV" in full_text and "Live Behavioral Data" in full_text:
                found_xiv = True
            if "Central Disclosure" in full_text:
                found_central_disclosure = True
    return found_xiv and found_central_disclosure


def main():
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        print("ERROR: Set NOTION_TOKEN environment variable")
        print("Usage: NOTION_TOKEN=ntn_xxx python notion_update_liza_profile.py")
        sys.exit(1)

    print(f"Fetching page blocks for {PAGE_ID}...")
    blocks = fetch_page_blocks(token, PAGE_ID)
    print(f"Found {len(blocks)} blocks on page")

    # Step 1: Find Section XII and add new quotes
    print("\n--- Step 1: Updating Section XII ---")
    section_xii_id, section_xii_idx = find_section_xii_block(blocks)
    if section_xii_id:
        last_xii_block = find_section_xii_last_child(blocks, section_xii_idx)
        xii_additions = build_section_xii_additions()
        print(f"Found Section XII at block {section_xii_id}")
        print(f"Appending {len(xii_additions)} new items after block {last_xii_block}")
        result = append_blocks(token, PAGE_ID, xii_additions, after_block_id=last_xii_block)
        print("Section XII updated successfully")
    else:
        print("WARNING: Could not find Section XII heading. Skipping Section XII update.")

    # Step 2: Append Section XIV at the end of the page
    print("\n--- Step 2: Appending Section XIV ---")
    # Re-fetch blocks to get updated state
    blocks = fetch_page_blocks(token, PAGE_ID)
    # Find the last block before any closing content
    last_block = blocks[-1]["id"] if blocks else None
    section_xiv = build_section_xiv_blocks()
    print(f"Appending {len(section_xiv)} blocks for Section XIV")
    result = append_blocks(token, PAGE_ID, section_xiv)
    print("Section XIV appended successfully")

    # Step 3: Verify
    print("\n--- Step 3: Verification ---")
    blocks = fetch_page_blocks(token, PAGE_ID)
    print(f"Page now has {len(blocks)} blocks")
    if verify_update(token, PAGE_ID):
        print("VERIFIED: Section XIV and Central Disclosure headings found on page")
    else:
        print("WARNING: Could not verify all expected sections. Manual check recommended.")

    # Print last 10 block summaries for verification
    print("\nLast 10 blocks on page:")
    for block in blocks[-10:]:
        bt = block.get("type", "unknown")
        text = ""
        if bt in ("heading_1", "heading_2", "heading_3", "paragraph", "bulleted_list_item"):
            text_items = block.get(bt, {}).get("rich_text", [])
            text = "".join(t.get("plain_text", "") for t in text_items)[:80]
        print(f"  [{bt}] {text}")


if __name__ == "__main__":
    main()
