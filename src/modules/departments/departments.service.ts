import prisma from '../../config/db';

export class DepartmentsService {
    async createDepartment(name: string) {
        const existing = await prisma.department.findUnique({ where: { name } });

        if (existing) {
            throw Object.assign(new Error('Department with this name already exists'), {
                statusCode: 409,
            });
        }

        const department = await prisma.department.create({
            data: { name },
        });

        return department;
    }

    async getAllDepartments(onlyActive?: boolean) {
        const where: any = {};

        if (onlyActive) {
            where.isActive = true;
        }

        const departments = await prisma.department.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return departments;
    }

    async getDepartmentById(id: string) {
        const department = await prisma.department.findUnique({
            where: { id },
        });

        if (!department) {
            throw Object.assign(new Error('Department not found'), {
                statusCode: 404,
            });
        }

        return department;
    }

    async updateDepartment(id: string, data: { name?: string; isActive?: boolean }) {
        const department = await prisma.department.findUnique({ where: { id } });

        if (!department) {
            throw Object.assign(new Error('Department not found'), {
                statusCode: 404,
            });
        }

        if (data.name) {
            const existing = await prisma.department.findUnique({
                where: { name: data.name },
            });

            if (existing && existing.id !== id) {
                throw Object.assign(
                    new Error('Department with this name already exists'),
                    { statusCode: 409 }
                );
            }
        }

        const updated = await prisma.department.update({
            where: { id },
            data,
        });

        return updated;
    }

    async deleteDepartment(id: string) {
        const department = await prisma.department.findUnique({ where: { id } });

        if (!department) {
            throw Object.assign(new Error('Department not found'), {
                statusCode: 404,
            });
        }

        await prisma.department.delete({ where: { id } });
    }
}

export const departmentsService = new DepartmentsService();
