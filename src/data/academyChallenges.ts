/**
 * 50+ coding challenges for kids – Python and JavaScript.
 */

import type { AcademyTrack } from "./academyLessons";

export interface AcademyChallenge {
  id: string;
  track: AcademyTrack;
  lessonId: string;
  title: string;
  task: string;
  starter: string;
  difficulty: "easy" | "medium" | "hard";
}

export const ACADEMY_CHALLENGES: AcademyChallenge[] = [
  { id: "py-1", track: "python", lessonId: "what-is-programming", title: "Say hello", task: "Print 'Hello, World!'", starter: "print(\"Hello, World!\")\n", difficulty: "easy" },
  { id: "py-2", track: "python", lessonId: "what-is-programming", title: "Print your name", task: "Print your name using print().", starter: "# Print your name\n", difficulty: "easy" },
  { id: "py-3", track: "python", lessonId: "what-is-programming", title: "Print three lines", task: "Print three different messages on three lines.", starter: "# Print 3 lines\n", difficulty: "easy" },
  { id: "js-1", track: "javascript", lessonId: "what-is-programming", title: "Say hello", task: "Log 'Hello, World!' to the console.", starter: "console.log(\"Hello, World!\");\n", difficulty: "easy" },
  { id: "js-2", track: "javascript", lessonId: "what-is-programming", title: "Log your name", task: "Log your name using console.log.", starter: "// Log your name\n", difficulty: "easy" },
  { id: "py-4", track: "python", lessonId: "variables", title: "Store and print", task: "Create a variable called age with value 10, then print it.", starter: "age = 10\n# print it\n", difficulty: "easy" },
  { id: "py-5", track: "python", lessonId: "variables", title: "Add two numbers", task: "Create variables a and b, add them, and print the result.", starter: "a = 5\nb = 3\n# print a + b\n", difficulty: "easy" },
  { id: "py-6", track: "python", lessonId: "variables", title: "Reassign variable", task: "Create a variable, change its value, then print it twice.", starter: "x = 1\n# change x and print twice\n", difficulty: "easy" },
  { id: "js-3", track: "javascript", lessonId: "variables", title: "Store and log", task: "Create let score = 100 and log it.", starter: "let score = 100;\n// log it\n", difficulty: "easy" },
  { id: "js-4", track: "javascript", lessonId: "variables", title: "Add two numbers", task: "Create variables a and b, add them, and log the result.", starter: "let a = 5;\nlet b = 3;\n// log a + b\n", difficulty: "easy" },
  { id: "py-7", track: "python", lessonId: "data-types", title: "One of each type", task: "Create one integer, one float, one string, and one boolean. Print each.", starter: "# Create and print one of each type\n", difficulty: "easy" },
  { id: "py-8", track: "python", lessonId: "conditions", title: "Hot or cold", task: "Set temp = 25. If temp > 30 print 'Hot', else print 'Cool'.", starter: "temp = 25\n# if/else here\n", difficulty: "easy" },
  { id: "py-9", track: "python", lessonId: "conditions", title: "Positive or not", task: "Set n = 5. If n > 0 print 'Positive', else print 'Not positive'.", starter: "n = 5\n", difficulty: "easy" },
  { id: "py-10", track: "python", lessonId: "conditions", title: "Grade message", task: "If score >= 80 print 'Great!', else print 'Keep trying!'.", starter: "score = 85\n", difficulty: "easy" },
  { id: "js-5", track: "javascript", lessonId: "conditions", title: "Hot or cold", task: "Set temp. If temp > 30 log 'Hot', else log 'Cool'.", starter: "let temp = 25;\n", difficulty: "easy" },
  { id: "js-6", track: "javascript", lessonId: "conditions", title: "Even or odd", task: "Set n = 4. If n % 2 === 0 log 'Even', else log 'Odd'.", starter: "let n = 4;\n", difficulty: "easy" },
  { id: "py-11", track: "python", lessonId: "loops", title: "Count 1 to 5", task: "Use a for loop to print 1, 2, 3, 4, 5.", starter: "for i in range(1, 6):\n    # print i\n", difficulty: "easy" },
  { id: "py-12", track: "python", lessonId: "loops", title: "Print three times", task: "Print 'Hi!' three times using a loop.", starter: "for _ in range(3):\n    pass  # print Hi!\n", difficulty: "easy" },
  { id: "py-13", track: "python", lessonId: "loops", title: "Sum 1 to 5", task: "Use a loop to add 1+2+3+4+5 and print the total.", starter: "total = 0\n# loop and add\n", difficulty: "easy" },
  { id: "js-7", track: "javascript", lessonId: "loops", title: "Count 1 to 5", task: "Use a for loop to log 1, 2, 3, 4, 5.", starter: "for (let i = 1; i <= 5; i++) {\n  // log i\n}\n", difficulty: "easy" },
  { id: "js-8", track: "javascript", lessonId: "loops", title: "Log five times", task: "Log 'Hello!' five times using a for loop.", starter: "// for loop here\n", difficulty: "easy" },
  { id: "py-14", track: "python", lessonId: "functions", title: "Function add", task: "Write a function add(a, b) that returns a + b. Call it with 3 and 5.", starter: "def add(a, b):\n    pass\n\nprint(add(3, 5))  # should be 8\n", difficulty: "easy" },
  { id: "py-15", track: "python", lessonId: "functions", title: "Double the number", task: "Write a function double(n) that returns n * 2.", starter: "def double(n):\n    pass\n\nprint(double(7))  # 14\n", difficulty: "easy" },
  { id: "py-16", track: "python", lessonId: "functions", title: "Greet", task: "Write a function greet(name) that returns 'Hello, ' + name.", starter: "def greet(name):\n    pass\n\nprint(greet(\"Alex\"))\n", difficulty: "easy" },
  { id: "js-9", track: "javascript", lessonId: "functions", title: "Function add", task: "Write a function add(a, b) that returns a + b.", starter: "function add(a, b) {\n  // return a + b\n}\nconsole.log(add(3, 5));\n", difficulty: "easy" },
  { id: "js-10", track: "javascript", lessonId: "functions", title: "Double", task: "Write a function double(n) that returns n * 2.", starter: "function double(n) {\n}\nconsole.log(double(5));\n", difficulty: "easy" },
  { id: "py-17", track: "python", lessonId: "lists", title: "First and last", task: "Create a list of 3 numbers. Print the first and last item.", starter: "nums = [10, 20, 30]\n# print first and last\n", difficulty: "easy" },
  { id: "py-18", track: "python", lessonId: "lists", title: "Largest number", task: "Write a function that takes a list of numbers and returns the largest.", starter: "def largest(nums):\n    pass\n\nprint(largest([1, 5, 3, 9, 2]))  # 9\n", difficulty: "medium" },
  { id: "py-19", track: "python", lessonId: "lists", title: "Sum of list", task: "Write a function sum_list(nums) that returns the sum.", starter: "def sum_list(nums):\n    pass\n\nprint(sum_list([1, 2, 3, 4]))  # 10\n", difficulty: "medium" },
  { id: "py-20", track: "python", lessonId: "lists", title: "Reverse a list", task: "Return a new list with items in reverse order.", starter: "def reverse_list(nums):\n    pass\n\nprint(reverse_list([1, 2, 3]))  # [3, 2, 1]\n", difficulty: "medium" },
  { id: "js-11", track: "javascript", lessonId: "arrays", title: "First and last", task: "Create an array of 3 numbers. Log the first and last element.", starter: "let arr = [10, 20, 30];\n", difficulty: "easy" },
  { id: "js-12", track: "javascript", lessonId: "arrays", title: "Reverse a string", task: "Write a function that takes a string and returns it reversed.", starter: "function reverse(str) {\n}\nconsole.log(reverse(\"hello\"));\n", difficulty: "medium" },
  { id: "js-13", track: "javascript", lessonId: "arrays", title: "Largest in array", task: "Write a function that returns the largest number in an array.", starter: "function largest(arr) {\n}\nconsole.log(largest([1, 5, 3, 9]));\n", difficulty: "medium" },
  { id: "py-21", track: "python", lessonId: "dictionaries", title: "Look up", task: "Create a dict with 'name' and 'age'. Print the name.", starter: "person = {\"name\": \"Alex\", \"age\": 10}\n", difficulty: "easy" },
  { id: "py-22", track: "python", lessonId: "dictionaries", title: "Add key", task: "Create a dict, add a new key, then print the dict.", starter: "d = {\"a\": 1}\n# add \"b\": 2\n", difficulty: "easy" },
  { id: "js-14", track: "javascript", lessonId: "objects", title: "Object and log", task: "Create an object with name and age. Log the name.", starter: "let person = { name: \"Alex\", age: 10 };\n", difficulty: "easy" },
  { id: "py-23", track: "python", lessonId: "loops", title: "Loop over list", task: "Create a list of fruits. Loop and print each fruit.", starter: "fruits = [\"apple\", \"banana\", \"cherry\"]\n", difficulty: "easy" },
  { id: "py-24", track: "python", lessonId: "loops", title: "Countdown", task: "Print 5, 4, 3, 2, 1 using a loop.", starter: "for i in range(5, 0, -1):\n    pass\n", difficulty: "easy" },
  { id: "py-25", track: "python", lessonId: "functions", title: "Is even?", task: "Write a function is_even(n) that returns True if n is even.", starter: "def is_even(n):\n    pass\n\nprint(is_even(4))   # True\nprint(is_even(5))   # False\n", difficulty: "medium" },
  { id: "py-26", track: "python", lessonId: "conditions", title: "Min of two", task: "Set a and b. Print the smaller of the two.", starter: "a = 3\nb = 7\n", difficulty: "easy" },
  { id: "py-27", track: "python", lessonId: "lists", title: "Count zeros", task: "Write a function that counts how many 0s are in a list.", starter: "def count_zeros(nums):\n    pass\n\nprint(count_zeros([0, 1, 0, 0]))  # 3\n", difficulty: "medium" },
  { id: "py-28", track: "python", lessonId: "lists", title: "Double each", task: "Given a list of numbers, return a new list with each doubled.", starter: "def double_list(nums):\n    pass\n\nprint(double_list([1, 2, 3]))  # [2, 4, 6]\n", difficulty: "medium" },
  { id: "js-15", track: "javascript", lessonId: "arrays", title: "Sum of array", task: "Write a function that returns the sum of all numbers in an array.", starter: "function sumArr(arr) {\n}\nconsole.log(sumArr([1, 2, 3, 4]));\n", difficulty: "medium" },
  { id: "js-16", track: "javascript", lessonId: "arrays", title: "Find max", task: "Write a function that returns the maximum value in an array.", starter: "function maxArr(arr) {\n}\nconsole.log(maxArr([3, 1, 4, 1, 5]));\n", difficulty: "medium" },
  { id: "py-29", track: "python", lessonId: "functions", title: "Multiply", task: "Write a function multiply(a, b) that returns a * b.", starter: "def multiply(a, b):\n    pass\n\nprint(multiply(4, 5))  # 20\n", difficulty: "easy" },
  { id: "py-30", track: "python", lessonId: "debugging", title: "Fix the bug", task: "The code should print 15. Fix it.", starter: "a = 10\nb = 5\nresult = a - b  # bug: should be +\nprint(result)\n", difficulty: "easy" },
  { id: "js-17", track: "javascript", lessonId: "debugging", title: "Fix the bug", task: "The code should log 20. Fix it.", starter: "let x = 4;\nlet y = 5;\nlet z = x + y;  // then multiply by 2?\nconsole.log(z);\n", difficulty: "easy" },
  { id: "py-31", track: "python", lessonId: "loops", title: "Factorial", task: "Write a function factorial(n) that returns 1*2*...*n. (e.g. factorial(5)=120)", starter: "def factorial(n):\n    pass\n\nprint(factorial(5))  # 120\n", difficulty: "hard" },
  { id: "py-32", track: "python", lessonId: "lists", title: "Average", task: "Write a function average(nums) that returns the average of a list.", starter: "def average(nums):\n    pass\n\nprint(average([10, 20, 30]))  # 20\n", difficulty: "medium" },
  { id: "py-33", track: "python", lessonId: "conditions", title: "Leap year?", task: "Given year, print 'Leap' if it's a leap year, else 'Normal'. (divisible by 4)", starter: "year = 2024\n", difficulty: "medium" },
  { id: "js-18", track: "javascript", lessonId: "functions", title: "Greet", task: "Write a function greet(name) that returns 'Hello, ' + name.", starter: "function greet(name) {\n}\nconsole.log(greet(\"Sam\"));\n", difficulty: "easy" },
  { id: "js-19", track: "javascript", lessonId: "arrays", title: "Reverse array", task: "Return a new array with elements in reverse order.", starter: "function reverseArr(arr) {\n}\nconsole.log(reverseArr([1, 2, 3]));\n", difficulty: "medium" },
  { id: "js-20", track: "javascript", lessonId: "loops", title: "Sum 1 to 10", task: "Use a for loop to add 1+2+...+10 and log the total.", starter: "let total = 0;\n", difficulty: "easy" },
  { id: "py-34", track: "python", lessonId: "dictionaries", title: "Merge dicts", task: "Given two dicts, return one dict with all keys (values from second if overlap).", starter: "def merge(a, b):\n    pass\n\nprint(merge({\"x\": 1}, {\"y\": 2}))\n", difficulty: "hard" },
  { id: "py-35", track: "python", lessonId: "lists", title: "Contains?", task: "Write a function contains(nums, target) that returns True if target is in nums.", starter: "def contains(nums, target):\n    pass\n\nprint(contains([1, 2, 3], 2))  # True\n", difficulty: "easy" },
  { id: "js-21", track: "javascript", lessonId: "conditions", title: "Absolute value", task: "If n is negative, log -n; else log n.", starter: "let n = -5;\n", difficulty: "easy" },
  { id: "js-22", track: "javascript", lessonId: "objects", title: "Full name", task: "Create an object with firstName and lastName. Log the full name.", starter: "let person = { firstName: \"Alex\", lastName: \"Lee\" };\n", difficulty: "easy" },
  { id: "py-36", track: "python", lessonId: "what-is-programming", title: "Print math", task: "Print the result of 7 * 8.", starter: "print(7 * 8)\n", difficulty: "easy" },
  { id: "py-37", track: "python", lessonId: "variables", title: "Swap", task: "Set a=1, b=2. Swap them so a=2, b=1. Print both.", starter: "a = 1\nb = 2\n# swap\n", difficulty: "medium" },
  { id: "py-38", track: "python", lessonId: "loops", title: "Table of 3", task: "Print 3*1=3, 3*2=6, ... 3*5=15 using a loop.", starter: "n = 3\n", difficulty: "easy" },
  { id: "js-23", track: "javascript", lessonId: "loops", title: "Table of 4", task: "Log 4*1=4, 4*2=8, ... 4*5=20 using a for loop.", starter: "let n = 4;\n", difficulty: "easy" },
  { id: "py-39", track: "python", lessonId: "functions", title: "Square", task: "Write a function square(n) that returns n * n.", starter: "def square(n):\n    pass\n\nprint(square(6))  # 36\n", difficulty: "easy" },
  { id: "js-24", track: "javascript", lessonId: "functions", title: "Square", task: "Write a function square(n) that returns n * n.", starter: "function square(n) {\n}\nconsole.log(square(6));\n", difficulty: "easy" },
  { id: "py-40", track: "python", lessonId: "lists", title: "Min in list", task: "Write a function that returns the smallest number in a list.", starter: "def smallest(nums):\n    pass\n\nprint(smallest([5, 2, 8, 1]))  # 1\n", difficulty: "medium" },
  { id: "js-25", track: "javascript", lessonId: "arrays", title: "Min in array", task: "Write a function that returns the smallest number in an array.", starter: "function smallest(arr) {\n}\nconsole.log(smallest([5, 2, 8, 1]));\n", difficulty: "medium" },
  { id: "py-41", track: "python", lessonId: "conditions", title: "Three-way", task: "If x<0 print 'negative', x==0 print 'zero', else 'positive'.", starter: "x = 0\n", difficulty: "easy" },
  { id: "js-26", track: "javascript", lessonId: "conditions", title: "Three-way", task: "If x<0 log 'negative', x===0 log 'zero', else 'positive'.", starter: "let x = 0;\n", difficulty: "easy" },
  { id: "py-42", track: "python", lessonId: "dictionaries", title: "Keys and values", task: "Loop over a dict and print each key and value.", starter: "d = {\"a\": 1, \"b\": 2}\n", difficulty: "easy" },
  { id: "js-27", track: "javascript", lessonId: "objects", title: "Keys", task: "Create an object. Log all its keys using Object.keys().", starter: "let obj = { a: 1, b: 2, c: 3 };\n", difficulty: "easy" },
  { id: "py-43", track: "python", lessonId: "lists", title: "Last element", task: "Write a function last(nums) that returns the last element. (Don't use [-1])", starter: "def last(nums):\n    pass\n\nprint(last([1, 2, 3]))  # 3\n", difficulty: "easy" },
  { id: "py-44", track: "python", lessonId: "functions", title: "Is positive?", task: "Write a function is_positive(n) that returns True if n > 0.", starter: "def is_positive(n):\n    pass\n\nprint(is_positive(5))   # True\nprint(is_positive(-1))  # False\n", difficulty: "easy" },
  { id: "js-28", track: "javascript", lessonId: "arrays", title: "First two", task: "Write a function that returns the first two elements of an array.", starter: "function firstTwo(arr) {\n}\nconsole.log(firstTwo([10, 20, 30]));\n", difficulty: "easy" },
  { id: "py-45", track: "python", lessonId: "loops", title: "Even numbers", task: "Print the even numbers from 2 to 10 (2, 4, 6, 8, 10).", starter: "for i in range(2, 11, 2):\n    pass\n", difficulty: "easy" },
  { id: "js-29", track: "javascript", lessonId: "loops", title: "Even numbers", task: "Log the even numbers from 2 to 10 using a for loop.", starter: "// 2, 4, 6, 8, 10\n", difficulty: "easy" },
  { id: "py-46", track: "python", lessonId: "debugging", title: "Fix name error", task: "The code uses a variable that isn't defined. Fix it.", starter: "message = \"Hi\"\nprint(mesage)  # typo\n", difficulty: "easy" },
  { id: "js-30", track: "javascript", lessonId: "debugging", title: "Fix typo", task: "The code has a typo. Fix it so it logs 10.", starter: "let count = 10;\nconsole.log(counnt);\n", difficulty: "easy" },
  { id: "py-47", track: "python", lessonId: "lists", title: "Append and print", task: "Start with an empty list. Append 1, 2, 3. Print the list.", starter: "nums = []\n", difficulty: "easy" },
  { id: "js-30b", track: "javascript", lessonId: "arrays", title: "Push and log", task: "Start with an empty array. Push 1, 2, 3. Log the array.", starter: "let arr = [];\n", difficulty: "easy" },
  { id: "py-48", track: "python", lessonId: "functions", title: "Max of two", task: "Write a function max_two(a, b) that returns the bigger number.", starter: "def max_two(a, b):\n    pass\n\nprint(max_two(3, 7))  # 7\n", difficulty: "easy" },
  { id: "js-31", track: "javascript", lessonId: "functions", title: "Max of two", task: "Write a function maxTwo(a, b) that returns the bigger number.", starter: "function maxTwo(a, b) {\n}\nconsole.log(maxTwo(3, 7));\n", difficulty: "easy" },
  { id: "py-49", track: "python", lessonId: "conditions", title: "Divisible by 5?", task: "If n is divisible by 5 print 'yes', else 'no'.", starter: "n = 15\n", difficulty: "easy" },
  { id: "js-32", track: "javascript", lessonId: "conditions", title: "Divisible by 3?", task: "If n % 3 === 0 log 'yes', else log 'no'.", starter: "let n = 9;\n", difficulty: "easy" },
  { id: "py-50", track: "python", lessonId: "lists", title: "Second element", task: "Write a function second(nums) that returns the second element (index 1).", starter: "def second(nums):\n    pass\n\nprint(second([10, 20, 30]))  # 20\n", difficulty: "easy" },
  { id: "js-33", track: "javascript", lessonId: "arrays", title: "Second element", task: "Write a function second(arr) that returns arr[1].", starter: "function second(arr) {\n}\nconsole.log(second([10, 20, 30]));\n", difficulty: "easy" },
];

export function getChallengesByTrack(track: AcademyTrack): AcademyChallenge[] {
  return ACADEMY_CHALLENGES.filter((c) => c.track === track);
}

export function getChallengeByIndex(index: number): AcademyChallenge | undefined {
  return ACADEMY_CHALLENGES[index];
}
