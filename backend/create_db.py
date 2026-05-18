import asyncio

import asyncpg


async def main():
    try:
        conn = await asyncpg.connect("postgresql://pequi:pequi@localhost:5432/pequi")
        await conn.execute("CREATE DATABASE pequi_test")
        await conn.close()
        print("Database pequi_test created")
    except asyncpg.exceptions.DuplicateDatabaseError:
        print("Database pequi_test already exists")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
