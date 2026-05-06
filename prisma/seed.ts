import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed estable... 🌱');
  const tenant = await prisma.tenant.create({
    data: { name: 'Cobranzas VIP', defaultInterest: 20.0 }
  });
  const hashedPassword = await bcrypt.hash('123456', 10);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin Principal',
      email: 'admin@cobranzas.com',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });
  console.log('✅ ÉXITO: Datos creados.');
}

main().finally(() => prisma.$disconnect());