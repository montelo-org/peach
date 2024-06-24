import time
import requests


def generate_image(prompt):
    prodia_key = "72a1b2b6-281a-4211-a658-e7c17780c2d2"
    response = requests.post(
        "https://api.prodia.com/v1/sdxl/generate",
        json={"prompt": prompt},
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "X-Prodia-Key": prodia_key,
        },
    )
    data = response.json()
    print("data: ", data)
    job = data["job"]

    if not job:
        return "Image could not be generated"

    num_tries = 0

    while True:
        if num_tries >= 30:
            return "Image could not be generated"
        response = requests.get(
            f"https://api.prodia.com/v1/job/{job}",
            headers={"accept": "application/json", "X-Prodia-Key": prodia_key},
        )
        data = response.json()
        print("job: ", data)
        status = data["status"]

        if status == "succeeded":
            return data["imageUrl"]

        num_tries += 1
        time.sleep(1)
