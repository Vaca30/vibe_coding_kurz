"""
Sample Python file with intentional code issues for demo purposes.

This file is used as input for the AI Code Review & Improvement System.
It contains intentional security, performance, and code quality problems.
"""

import sqlite3
import json


def get_user(username):
    conn = sqlite3.connect("users.db")
    # SQL injection vulnerability: string formatting instead of parameters
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchone()
    conn.close()
    return result


def find_duplicates(items):
    duplicates = []
    # O(n²) algorithm – should use a set for O(n)
    for i in range(len(items)):
        for j in range(len(items)):
            if i != j and items[i] == items[j]:
                if items[i] not in duplicates:
                    duplicates.append(items[i])
    return duplicates


def read_config(path):
    # Resource leak: file not closed if exception occurs
    f = open(path, "r")
    data = json.load(f)
    f.close()
    return data


def process_records(records):
    results = []
    for record in records:
        # No error handling for missing/invalid data
        value = int(record["value"])
        name = record["name"].strip().upper()

        def format_entry(v):
            # Variable shadowing: 'name' from outer scope is shadowed below
            name = f"entry_{v}"
            return f"{name}:{v}"

        results.append(format_entry(value))

    return results


def calculate_stats(numbers):
    # Missing type hints throughout the file
    total = 0
    for n in numbers:
        total = total + n
    mean = total / len(numbers)

    variance = 0
    for n in numbers:
        variance = variance + (n - mean) ** 2
    variance = variance / len(numbers)

    return {"mean": mean, "variance": variance, "total": total}


def load_users_from_file(filepath, admin_username):
    conn = sqlite3.connect("app.db")
    # Another SQL injection vulnerability
    cursor = conn.cursor()
    cursor.execute(
        "SELECT permissions FROM users WHERE username = '" + admin_username + "'"
    )
    permissions = cursor.fetchone()
    conn.close()

    if permissions and "admin" in permissions[0]:
        # Resource leak: file handle not closed on exception
        file_handle = open(filepath, "r")
        content = file_handle.read()
        file_handle.close()
        return json.loads(content)
    return []


if __name__ == "__main__":
    # Demo usage
    print(find_duplicates([1, 2, 3, 2, 4, 3, 5]))
    print(calculate_stats([10, 20, 30, 40, 50]))
