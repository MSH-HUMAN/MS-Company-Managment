import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, canModifyRecord, clearRoleCache } from "@/lib/auth-helpers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const existing = await prisma.role.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "roles", "edit", existing))) {
      await createAuditLog(user, "Status Changed", "roles", null, `Unauthorized attempt to edit role ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Protection: Cannot edit default system roles unless Super Admin
    if (!existing.company && user.role !== "Super Admin") {
      return NextResponse.json({ error: "Cannot modify default system roles" }, { status: 403 });
    }

    // Tenancy Check: Company Admin can only edit roles scoped to their company
    if (existing.company && user.role !== "Super Admin" && user.company !== existing.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        permissions: data.permissions ?? undefined,
        isCustom: data.isCustom !== undefined ? data.isCustom : undefined,
        company: user.role === "Super Admin" ? (data.company !== undefined ? data.company : undefined) : undefined
      }
    });

    clearRoleCache();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT role error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.role.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "roles", "delete", existing))) {
      await createAuditLog(user, "Status Changed", "roles", null, `Unauthorized attempt to delete role ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Protection: Cannot delete system roles
    if (!existing.company && user.role !== "Super Admin") {
      return NextResponse.json({ error: "Cannot delete default system roles" }, { status: 403 });
    }

    // Tenancy Check: Company Admin can only delete roles scoped to their company
    if (existing.company && user.role !== "Super Admin" && user.company !== existing.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.role.delete({
      where: { id }
    });

    clearRoleCache();

    return NextResponse.json({ success: true, message: "Role deleted" });
  } catch (error: any) {
    console.error("DELETE role error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
