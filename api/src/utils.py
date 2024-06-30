import re


def preprocess_output(text, preview=False):
    """
    Preprocesses the output text by removing any leading or trailing
    whitespace, converting all whitespace sequences to a single space
    character, and capitalizing the first character of the text.

    Args:
        text (str): The text to be preprocessed.

    Returns:
        str: The preprocessed text.
    """
    text = re.sub(r'\s+', ' ', text.strip())
    ensure_sentence_starting_uppercase = True
    ensure_sentence_ends_with_period = True

    if ensure_sentence_starting_uppercase:
        if text:
            text = text[0].upper() + text[1:]

    # Ensure the text ends with a proper punctuation
    # if it ends with an alphanumeric character
    if not preview:
        if ensure_sentence_ends_with_period:
            if text and text[-1].isalnum():
                text += '.'

    return text


def find_tail_match_in_text(text1, text2, length_of_match=10):
    # Check if either of the texts is too short
    if len(text1) < length_of_match or len(text2) < length_of_match:
        return -1

    # The end portion of the first text that we want to compare
    target_substring = text1[-length_of_match:]

    # Loop through text2 from right to left
    for i in range(len(text2) - length_of_match + 1):
        # Extract the substring from text2
        # to compare with the target_substring
        current_substring = text2[len(text2) - i - length_of_match:
                                  len(text2) - i]

        # Compare the current_substring with the target_substring
        if current_substring == target_substring:
            # Position in text2 where the match starts
            return len(text2) - i

    return -1
