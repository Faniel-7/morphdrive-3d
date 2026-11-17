import json
import struct
from pathlib import Path

MODELS_DIR = Path("public/models")
OUTPUT = Path("vehicle-component-report-live.txt")

def read_glb(path):
    with path.open("rb") as f:
        header = f.read(12)

        if len(header) != 12:
            raise ValueError("Invalid GLB header")

        magic, version, total_length = struct.unpack("<4sII", header)

        if magic != b"glTF":
            raise ValueError("Not a GLB file")

        while f.tell() < total_length:
            chunk_header = f.read(8)

            if len(chunk_header) != 8:
                break

            chunk_length, chunk_type = struct.unpack("<II", chunk_header)
            chunk_data = f.read(chunk_length)

            # JSON chunk
            if chunk_type == 0x4E4F534A:
                return json.loads(chunk_data.decode("utf-8"))

    raise ValueError("GLB JSON chunk not found")


def build_report(path):
    data = read_glb(path)
    nodes = data.get("nodes", [])
    meshes = data.get("meshes", [])
    scenes = data.get("scenes", [])

    child_map = {
        i: node.get("children", [])
        for i, node in enumerate(nodes)
    }

    def count_meshes(index, visited=None):
        if visited is None:
            visited = set()

        if index in visited:
            return 0

        visited.add(index)
        node = nodes[index]

        count = 1 if "mesh" in node else 0

        for child in child_map[index]:
            count += count_meshes(child, visited)

        return count

    def print_node(index, depth, lines, ancestors):
        node = nodes[index]
        name = node.get("name", f"Node_{index}")
        children = child_map[index]
        mesh_index = node.get("mesh")
        mesh_count = count_meshes(index)

        if index in ancestors:
            lines.append("  " * depth + f"[CYCLE] {name}")
            return

        if mesh_index is not None:
            mesh_name = (
                meshes[mesh_index].get("name")
                or f"Mesh_{mesh_index}"
            )
            mesh_info = f" | mesh={mesh_name} | mesh_id={mesh_index}"
        else:
            mesh_info = ""

        lines.append(
            "  " * depth
            + f"- {name}"
            + f" | node_id={index}"
            + f" | children={len(children)}"
            + f" | descendant_meshes={mesh_count}"
            + mesh_info
        )

        next_ancestors = ancestors | {index}

        for child in children:
            print_node(child, depth + 1, lines, next_ancestors)

    lines = []
    lines.append("=" * 100)
    lines.append(f"MODEL: {path.name}")
    lines.append(f"PATH: {path}")
    lines.append(f"TOTAL NODES: {len(nodes)}")
    lines.append(f"TOTAL MESH DEFINITIONS: {len(meshes)}")
    lines.append(f"TOTAL SCENES: {len(scenes)}")
    lines.append("=" * 100)

    if not scenes:
        lines.append("No scenes found.")
        return lines

    for scene_number, scene in enumerate(scenes):
        lines.append("")
        lines.append(f"SCENE {scene_number}: {scene.get('name', 'Unnamed')}")
        lines.append("-" * 80)

        roots = scene.get("nodes", [])

        for root_index in roots:
            print_node(root_index, 0, lines, set())

    return lines


model_files = sorted(
    p for p in MODELS_DIR.rglob("*.glb")
    if "/hand/" not in p.as_posix().lower()
)

report = [
    "MORPHDRIVE 3D - COMPLETE GLB COMPONENT REPORT",
    f"Models directory: {MODELS_DIR.resolve()}",
    f"GLB files found: {len(model_files)}",
    ""
]

for number, path in enumerate(model_files, 1):
    print(f"[{number}/{len(model_files)}] Reading {path.name}")

    try:
        report.extend(build_report(path))
    except Exception as error:
        report.extend([
            "",
            f"ERROR READING: {path}",
            str(error),
            ""
        ])

    report.append("")

OUTPUT.write_text("\n".join(report), encoding="utf-8")

print("\nREPORT GENERATED SUCCESSFULLY")
print(f"File: {OUTPUT.resolve()}")
print(f"Size: {OUTPUT.stat().st_size / 1024:.1f} KB")
print(f"Lines: {len(report)}")
