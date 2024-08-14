import multiprocessing
from multiprocessing import Process
from ctypes import c_wchar_p  # c_wchar_p
from time import sleep
import random


def processA(sharedMessageA):
    while True:  # set up and render GUI
        sleep(0.01)
        if (
            sharedMessageA.value == "Left"
        ):  # Read shared variable from ProcessB and do things
            print("Lbutton")
        elif sharedMessageA.value == "Right":
            print("Rbutton")


def processB(sharedMessageB):
    while True:
        sleep(0.05)  # get video stream and performs various computer vision functions
        sharedMessageB.value = random.choice(
            ["Left", "Right"]
        )  # write result of functions to variable for process A to use


def startMultiProcessing():
    p1 = Process(target=processA, args=(sharedMessage,))
    p2 = Process(target=processB, args=(sharedMessage,))
    p1.start()
    p2.start()


def main():
    startMultiProcessing()
    sleep(30)


if __name__ == "__main__":
    manager = multiprocessing.Manager()
    sharedMessage = manager.Value(c_wchar_p, "Test")  # initialise shared value
    main()
