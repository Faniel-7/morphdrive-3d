import json
import struct
from pathlib import Path
from datetime import datetime

MODEL_DIR = Path("public/models")
OUTPUT_FILE = Path("vehicle-component-report.txt")


def load_model_json(path):
    """Read the JSON structure from GLB or GLTF."""
    if path.suffix.lower() == ".gltf":
        return json.loads(path.read_text(encoding="utf-8"))

    with path.open("rb") as f:
        header = f.read(12)

        if len(header) != 12:
            raise ValueError("Invalid GLB header")

        magic, version, total_length = struct.unpack("<4sII", header)

        if magic != b"glTF":
            raise ValueError("Invalid GLB file")

        while f.tell() < total_length:
            chunk_header = f.read(8)

            if len(chunk_header) != 8:
                break

            chunk_length, chunk_type = struct.unpack("<II", chunk_header)
            chunk_data = f.read(chunk_length)

            # JSON chunk
            if chunk_type == 0x4E4F534A:
                return json.loads(chunk_data.decode("utf-8").rstrip(" \t\r\n\0"))

    raise ValueError("No JSON chunk found in GLB")


def accessor_count(data, accessor_index):
    accessors = data.get("accessors", [])

    if accessor_index is None or accessor_index >= len(accessors):
        return 0

    return accessors[accessor_index].get("count", 0)


def get_mesh_information(data, mesh_index):
    meshes = data.get("meshes", [])

    if mesh_index is None or mesh_index >= len(meshes):
        return None

    mesh = meshes[mesh_index]
    primitives = mesh.get("primitives", [])

    details = []
    total_vertices = 0
    total_triangles = 0

    for primitive_index, primitive in enumerate(primitives):
        attributes = primitive.get("attributes", {})
        position_accessor = attributes.get("POSITION")
        vertices = accessor_count(data, position_accessor)

        indices_accessor = primitive.get("indices")
        index_count = (
            accessor_count(data, indices_accessor)
            if indices_accessor is not None
            else vertices
        )

        mode = primitive.get("mode", 4)

        if mode == 4:
            triangles = index_count // 3
        elif mode in (5, 6):
            triangles = max(0, index_count - 2)
        else:
            triangles = 0

        material_index = primitive.get("material")
        materials = data.get("materials", [])

        if material_index is not None and material_index < len(materials):
            material = materials[material_index]
            material_name = material.get(
                "name", f"Material_{material_index}"
            )
        else:
            material_name = "Default / Unassigned"

        total_vertices += vertices
        total_triangles += triangles

        details.append({
            "primitive": primitive_index,
            "vertices": vertices,
            "triangles": triangles,
            "material": material_name,
            "mode": mode
        })

    return {
        "name": mesh.get("name", f"Mesh_{mesh_index}"),
        "primitive_count": len(primitives),
        "vertices": total_vertices,
        "triangles": total_triangles,
        "details": details
    }


def analyze_model(path, report):
    report.append("\n" + "=" * 100)
    report.append(f"MODEL FILE: {path}")
    report.append("=" * 100)

    data = load_model_json(path)

    nodes = data.get("nodes", [])
    meshes = data.get("meshes", [])
    materials = data.get("materials", [])
    skins = data.get("skins", [])

    report.append(f"Total nodes: {len(nodes)}")
    report.append(f"Total meshes: {len(meshes)}")
    report.append(f"Total materials: {len(materials)}")
    report.append(f"Total skins: {len(skins)}")
    report.append("")

    # Build parent relationships.
    parents = {}

    for parent_index, node in enumerate(nodes):
        for child_index in node.get("children", []):
            parents.setdefault(child_index, []).append(parent_index)

    roots = [
        i for i in range(len(nodes))
        if i not in parents
    ]

    if not roots and nodes:
        roots = [0]

    visited = set()
    total_mesh_nodes = 0
    total_node_triangles = 0

    def visit(node_index, depth, ancestry):
        nonlocal total_mesh_nodes, total_node_triangles

        if node_index >= len(nodes):
            return

        if node_index in ancestry:
            report.append("  " * depth + "[CYCLE DETECTED]")
            return

        node = nodes[node_index]
        visited.add(node_index)

        name = node.get("name", f"Node_{node_index}")
        mesh_index = node.get("mesh")
        children = node.get("children", [])

        prefix = "  " * depth

        report.append(
            f"{prefix}[NODE {node_index}] {name}"
        )

        report.append(
            f"{prefix}  Type: "
            f"{'MESH NODE' if mesh_index is not None else 'GROUP / EMPTY'}"
        )

        report.append(f"{prefix}  Children: {len(children)}")

        if "translation" in node:
            report.append(
                f"{prefix}  Translation: {node['translation']}"
            )

        if "rotation" in node:
            report.append(
                f"{prefix}  Rotation: {node['rotation']}"
            )

        if "scale" in node:
            report.append(
                f"{prefix}  Scale: {node['scale']}"
            )

        if "matrix" in node:
            report.append(
                f"{prefix}  Matrix: {node['matrix']}"
            )

        if "skin" in node:
            skin_index = node["skin"]
            report.append(
                f"{prefix}  Skin reference: {skin_index}"
            )

            if skin_index < len(skins):
                joints = skins[skin_index].get("joints", [])
                report.append(
                    f"{prefix}  Skin joints: {len(joints)}"
                )

        if mesh_index is not None:
            total_mesh_nodes += 1
            mesh_info = get_mesh_information(data, mesh_index)

            if mesh_info:
                total_node_triangles += mesh_info["triangles"]

                report.append(
                    f"{prefix}  Mesh index: {mesh_index}"
                )
                report.append(
                    f"{prefix}  Mesh name: {mesh_info['name']}"
                )
                report.append(
                    f"{prefix}  Primitives: {mesh_info['primitive_count']}"
                )
                report.append(
                    f"{prefix}  Vertices: {mesh_info['vertices']}"
                )
                report.append(
                    f"{prefix}  Triangles: {mesh_info['triangles']}"
                )

                for detail in mesh_info["details"]:
                    report.append(
                        f"{prefix}    Primitive {detail['primitive']}: "
                        f"{detail['vertices']} vertices, "
                        f"{detail['triangles']} triangles, "
                        f"Material: {detail['material']}, "
                        f"Mode: {detail['mode']}"
                    )

        report.append("")

        for child_index in children:
            visit(
                child_index,
                depth + 1,
                ancestry | {node_index}
            )

    for root_index in roots:
        visit(root_index, 0, set())

    # Include any nodes not reached from the root hierarchy.
    for node_index in range(len(nodes)):
        if node_index not in visited:
            report.append("[UNREACHED NODE]")
            visit(node_index, 0, set())

    report.append("-" * 80)
    report.append("MODEL SUMMARY")
    report.append(f"Nodes containing meshes: {total_mesh_nodes}")
    report.append(f"Total triangles across mesh nodes: {total_node_triangles}")
    report.append("-" * 80)


def main():
    if not MODEL_DIR.exists():
        print(f"ERROR: Model folder not found: {MODEL_DIR.resolve()}")
        return

    model_files = sorted(
        list(MODEL_DIR.rglob("*.glb")) +
        list(MODEL_DIR.rglob("*.gltf"))
    )

    if not model_files:
        print(f"No GLB or GLTF files found in {MODEL_DIR.resolve()}")
        return

    report = [
        "MORPHDRIVE 3D - VEHICLE COMPONENT REPORT",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Model directory: {MODEL_DIR.resolve()}",
        f"Models found: {len(model_files)}",
        "",
        "This report describes the model node hierarchy and mesh references.",
        "Names are taken directly from the original GLB/GLTF files.",
        ""
    ]

    successful = 0
    failed = 0

    for path in model_files:
        try:
            analyze_model(path, report)
            successful += 1
            print(f"[OK] {path}")
        except Exception as error:
            failed += 1
            report.extend([
                "\n" + "=" * 100,
                f"MODEL FILE: {path}",
                f"ERROR: {type(error).__name__}: {error}",
                "=" * 100
            ])
            print(f"[ERROR] {path}: {error}")

    report.extend([
        "",
        "=" * 100,
        "FINAL SCAN SUMMARY",
        f"Models found: {len(model_files)}",
        f"Successfully analyzed: {successful}",
        f"Failed: {failed}",
        "=" * 100
    ])

    OUTPUT_FILE.write_text(
        "\n".join(report),
        encoding="utf-8"
    )

    print("\n" + "=" * 60)
    print("SCAN COMPLETE")
    print(f"Successfully analyzed: {successful}")
    print(f"Failed: {failed}")
    print(f"Report saved to: {OUTPUT_FILE.resolve()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
