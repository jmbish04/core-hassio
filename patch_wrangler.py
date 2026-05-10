import json

with open('wrangler.jsonc', 'r') as f:
    # the file is jsonc, we need to strip comments or just use a simple regex to insert
    # Actually, it's easier to just do text replacement for a simple file
    content = f.read()

# We'll just insert the durable_objects and migrations block before the last closing brace
# But let's find a safe spot
durable_objects = """
  "durable_objects": {
    "bindings": [
      {
        "name": "HA_RELAY",
        "class_name": "HAWebSocketRelay"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["HAWebSocketRelay"]
    }
  ],
"""

if '"durable_objects"' not in content:
    # insert before the last '}'
    last_brace_index = content.rfind('}')
    content = content[:last_brace_index] + durable_objects + content[last_brace_index:]
    with open('wrangler.jsonc', 'w') as f:
        f.write(content)
