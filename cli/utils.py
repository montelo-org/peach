import time


def log_function_time(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        elapsed_time = (end_time - start_time) * 1000  # Convert to milliseconds
        rounded_time = round(elapsed_time)  # Round to nearest millisecond
        print(f"{func.__name__} took {rounded_time} ms to run")
        return result

    return wrapper
