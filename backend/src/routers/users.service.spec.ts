import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // Arrange: Define the input and the expected "fake" output
      const userDto = {
        email: 'test@test.com',
        password: 'password123',
        username: 'testuser',
      };

      const expectedUser = {
        id: 1,
        createdAt: new Date(),
        devices: [],
        ...userDto,
      };

      prisma.user.create.mockResolvedValue(expectedUser as any);

      const result = await service.createUser(userDto);

      expect(result).toEqual(expectedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userDto });
    });
  });

  describe('user', () => {
    it('should find a user by unique input', async () => {
      const mockUser = { id: 1, email: 'test@test.com', username: 'testuser' };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.user({ id: 1 });

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
