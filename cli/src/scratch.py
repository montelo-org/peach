import asyncio
import multiprocessing
import time


async def async_task(name, duration):
    print(f"Task {name} started")
    await asyncio.sleep(duration)
    print(f"Task {name} completed after {duration} seconds")


async def worker(name):
    print(f"Worker {name} started")
    async with asyncio.TaskGroup() as tg:
        tg.create_task(async_task(name, 5))
    print(f"Worker {name} finished")


def run_async_worker(name):
    asyncio.run(worker(name))


def main():
    processes = []
    for i in range(2):
        p = multiprocessing.Process(target=run_async_worker, args=(f"Worker-{i}",))
        processes.append(p)
        p.start()

    # Let the processes run for a while
    time.sleep(10)

    # Terminate the processes
    for p in processes:
        p.terminate()
        p.join()

    print("Main process finished")


if __name__ == "__main__":
    main()
