"use server";

import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function actualizarPrioridad(formData: FormData) {
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) throw new Error("No autorizado");

  const clientId = formData.get("clientId") as string;
  const priority = parseInt(formData.get("priority") as string);

  await prisma.client.update({
    where: { id: clientId },
    data: { priority: isNaN(priority) ? 0 : priority }
  });

  revalidatePath("/dashboard/prioridad");
}

export async function reordenarPrioridad(formData: FormData) {
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) throw new Error("No autorizado");

  const clientId = formData.get("clientId") as string;
  const direccion = formData.get("direccion") as string; // "up" | "down"

  const cliente = await prisma.client.findUnique({
    where: { id: clientId },
    include: { route: { include: { clients: { where: { active: true }, orderBy: { priority: 'asc' } } } } }
  });

  if (!cliente) return;

  const clients = cliente.route.clients;
  const idx = clients.findIndex(c => c.id === clientId);

  if (direccion === "up" && idx > 0) {
    const swapWith = clients[idx - 1];
    await prisma.client.update({ where: { id: clientId }, data: { priority: swapWith.priority } });
    await prisma.client.update({ where: { id: swapWith.id }, data: { priority: cliente.priority } });
  } else if (direccion === "down" && idx < clients.length - 1) {
    const swapWith = clients[idx + 1];
    await prisma.client.update({ where: { id: clientId }, data: { priority: swapWith.priority } });
    await prisma.client.update({ where: { id: swapWith.id }, data: { priority: cliente.priority } });
  }

  revalidatePath("/dashboard/prioridad");
}
