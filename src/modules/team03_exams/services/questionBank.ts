// Team 03 (EduExam AI) — built-in subject knowledge bank used by the offline AI question generator.
// Each topic carries `match` keywords so the generator can pick topics that appear in the faculty's course outline.

export type BankKind = 'MCQ' | 'SHORT' | 'LONG';

export interface BankItem {
  kind: BankKind;
  prompt: string;
  options?: string[];
  answer?: string; // MCQ: correct option text
  model?: string;  // SHORT / LONG: model answer
}

export interface BankTopic {
  name: string;
  match: string[];
  items: BankItem[];
}

const mcq = (prompt: string, answer: string, wrong: string[]): BankItem => ({
  kind: 'MCQ', prompt, answer, options: [answer, ...wrong]
});
const short = (prompt: string, model: string): BankItem => ({ kind: 'SHORT', prompt, model });
const long = (prompt: string, model: string): BankItem => ({ kind: 'LONG', prompt, model });

const PYTHON: BankTopic[] = [
  {
    name: 'Data Types and Variables',
    match: ['data type', 'variable', 'list', 'tuple', 'dictionary', 'string', 'set', 'basics'],
    items: [
      mcq('Which of the following Python data types is immutable?', 'tuple', ['list', 'dictionary', 'set']),
      mcq('What is the type of the value returned by 3 / 2 in Python 3?', 'float', ['int', 'double', 'decimal']),
      short('Differentiate between a list and a tuple in Python.',
        'A list is mutable and written with square brackets so elements can be added, removed or changed using append, insert and remove. A tuple is immutable and written with parentheses, it uses less memory, is faster and can be used as a dictionary key.'),
      long('Explain the built-in data structures of Python (list, tuple, set and dictionary) with examples and use cases.',
        'A list is an ordered mutable collection that allows duplicates. A tuple is an ordered immutable collection. A set is an unordered collection of unique elements supporting union, intersection and difference. A dictionary stores key value pairs with fast lookup by key. Lists suit sequences, tuples suit fixed records, sets suit membership tests and removing duplicates, dictionaries suit mappings.')
    ]
  },
  {
    name: 'Control Flow and Functions',
    match: ['loop', 'function', 'if', 'recursion', 'lambda', 'control', 'argument', 'flow'],
    items: [
      mcq('Which keyword is used to define a function in Python?', 'def', ['function', 'fun', 'define']),
      mcq('What does range(2, 10, 3) generate?', '2, 5, 8', ['2, 5, 8, 11', '3, 6, 9', '2, 4, 6, 8']),
      short('What is a lambda function? Give an example.',
        'A lambda is a small anonymous function defined with the lambda keyword that contains a single expression and returns its value automatically, for example lambda x: x * 2, often used with map, filter and sorted.'),
      long('Explain the types of function arguments in Python: positional, keyword, default, *args and **kwargs with examples.',
        'Positional arguments are matched by position. Keyword arguments are matched by name. Default arguments take a predefined value when the caller omits them. *args collects extra positional arguments into a tuple. **kwargs collects extra keyword arguments into a dictionary. Together they make functions flexible and allow variable number of arguments.')
    ]
  },
  {
    name: 'Object-Oriented Programming',
    match: ['class', 'object', 'oop', 'inheritance', 'polymorphism', 'encapsulation', 'constructor'],
    items: [
      mcq('Which method is automatically called when an object of a class is created in Python?', '__init__', ['__new_object__', '__create__', '__start__']),
      mcq('Which OOP principle allows a class to acquire the properties of another class?', 'Inheritance', ['Encapsulation', 'Abstraction', 'Overloading']),
      short('Differentiate between a class variable and an instance variable.',
        'A class variable is shared by all objects of the class and defined inside the class body. An instance variable is unique to each object and is usually created inside the __init__ method using self.'),
      long('Explain inheritance and polymorphism in Python with suitable examples.',
        'Inheritance lets a child class reuse and extend the attributes and methods of a parent class, including single, multiple and multilevel inheritance, using super to call the parent. Polymorphism lets the same method name behave differently for different classes through method overriding and duck typing. Together they promote code reuse and flexibility.')
    ]
  },
  {
    name: 'File Handling and Exceptions',
    match: ['file', 'exception', 'error', 'try', 'handling'],
    items: [
      mcq('Which file mode is used to append data to the end of an existing file?', "'a'", ["'r'", "'w'", "'x'"]),
      mcq('Which block is always executed in Python exception handling, whether or not an exception occurs?', 'finally', ['except', 'else', 'try']),
      short('Why is the "with open()" statement preferred for file handling?',
        'The with statement uses a context manager that automatically closes the file when the block ends, even if an exception occurs, so resources are not leaked and no explicit close call is needed.'),
      long('Explain exception handling in Python using try, except, else, finally and raising custom exceptions.',
        'Code that may fail is placed in the try block. The except block catches specific exceptions. The else block runs when no exception occurs. The finally block always runs for cleanup. The raise keyword throws an exception manually and custom exceptions are created by inheriting from the Exception class. This prevents abnormal program termination.')
    ]
  }
];

const JAVA: BankTopic[] = [
  {
    name: 'OOP Concepts in Java',
    match: ['class', 'object', 'oop', 'inheritance', 'polymorphism', 'abstraction', 'interface', 'encapsulation'],
    items: [
      mcq('Which keyword is used to inherit a class in Java?', 'extends', ['implements', 'inherits', 'super']),
      mcq('Which of the following is NOT a primitive data type in Java?', 'String', ['int', 'boolean', 'char']),
      short('Differentiate between an abstract class and an interface in Java.',
        'An abstract class can have both abstract and concrete methods, instance variables and constructors, and a class can extend only one. An interface defines a contract of abstract methods with constants, and a class can implement multiple interfaces.'),
      long('Explain compile-time and run-time polymorphism in Java with examples.',
        'Compile-time polymorphism is method overloading where methods share a name but differ in parameters and the call is resolved by the compiler. Run-time polymorphism is method overriding where a subclass redefines a parent method and the call is resolved dynamically using the actual object type through dynamic method dispatch.')
    ]
  },
  {
    name: 'Exception Handling',
    match: ['exception', 'error', 'try', 'catch', 'throw'],
    items: [
      mcq('Which of the following is a checked exception in Java?', 'IOException', ['NullPointerException', 'ArithmeticException', 'ArrayIndexOutOfBoundsException']),
      mcq('Which keyword is used to explicitly throw an exception in Java?', 'throw', ['throws', 'catch', 'final']),
      short('Differentiate between throw and throws in Java.',
        'The throw keyword is used inside a method body to explicitly throw one exception object. The throws keyword is used in the method signature to declare the exceptions that the method may pass to its caller.'),
      long('Explain the exception hierarchy in Java and the difference between checked and unchecked exceptions.',
        'Throwable is the root class with two branches Error and Exception. Checked exceptions such as IOException are verified by the compiler and must be handled with try catch or declared with throws. Unchecked exceptions are subclasses of RuntimeException such as NullPointerException and are not checked at compile time. Errors represent serious problems like OutOfMemoryError.')
    ]
  },
  {
    name: 'Collections Framework',
    match: ['collection', 'list', 'set', 'map', 'arraylist', 'hashmap', 'framework'],
    items: [
      mcq('Which collection does NOT allow duplicate elements?', 'HashSet', ['ArrayList', 'LinkedList', 'Vector']),
      mcq('Which Java class implements a resizable (dynamic) array?', 'ArrayList', ['LinkedList', 'HashSet', 'TreeMap']),
      short('Differentiate between ArrayList and LinkedList.',
        'ArrayList is backed by a dynamic array so random access is fast but insertion and deletion in the middle are slow. LinkedList is a doubly linked list so insertion and deletion are fast but access by index is slow.'),
      long('Explain the Java Collections Framework hierarchy with its main interfaces and implementations.',
        'The framework has the Collection interface with List, Set and Queue sub-interfaces, and a separate Map interface. List is implemented by ArrayList and LinkedList, Set by HashSet and TreeSet, Queue by PriorityQueue, and Map by HashMap and TreeMap. It provides ready made data structures and algorithms through the Collections utility class.')
    ]
  },
  {
    name: 'Multithreading',
    match: ['thread', 'multithreading', 'concurrency', 'synchroniz', 'runnable'],
    items: [
      mcq('Which method of the Thread class starts the execution of a new thread?', 'start()', ['run()', 'begin()', 'execute()']),
      mcq('Which interface can be implemented to create a thread task in Java?', 'Runnable', ['Serializable', 'Cloneable', 'Comparable']),
      short('What is the purpose of the synchronized keyword in Java?',
        'The synchronized keyword allows only one thread at a time to access a method or block, using an object lock, which prevents race conditions and data inconsistency when threads share resources.'),
      long('Explain the life cycle of a thread in Java with its states.',
        'A thread moves through New, Runnable, Running, Blocked or Waiting, and Terminated states. It is New when created, Runnable after start is called, Running when the scheduler gives it the CPU, Blocked or Waiting while waiting for a lock or sleeping, and Terminated when run completes.')
    ]
  }
];

const DSA: BankTopic[] = [
  {
    name: 'Arrays and Linked Lists',
    match: ['array', 'linked list', 'list', 'node', 'pointer'],
    items: [
      mcq('What is the time complexity of accessing an element of an array by its index?', 'O(1)', ['O(n)', 'O(log n)', 'O(n log n)']),
      mcq('What is the time complexity of inserting a node at the head of a singly linked list?', 'O(1)', ['O(n)', 'O(log n)', 'O(n^2)']),
      short('Differentiate between an array and a linked list.',
        'An array stores elements in contiguous memory with fixed size and constant time index access but slow insertion and deletion. A linked list stores nodes connected by pointers with dynamic size and fast insertion and deletion but sequential access.'),
      long('Explain insertion, deletion and traversal operations on a singly linked list with their time complexities.',
        'Insertion at the head is O(1) by pointing the new node to the old head. Insertion at the tail or a position needs traversal and takes O(n). Deletion updates the previous node pointer to skip the target node and takes O(n) to locate it, O(1) at the head. Traversal visits each node once following next pointers in O(n).')
    ]
  },
  {
    name: 'Stacks and Queues',
    match: ['stack', 'queue', 'lifo', 'fifo', 'postfix', 'infix'],
    items: [
      mcq('Which data structure follows the LIFO principle?', 'Stack', ['Queue', 'Array', 'Tree']),
      mcq('Which data structure is used for Breadth First Search of a graph?', 'Queue', ['Stack', 'Heap', 'Tree']),
      short('List any three applications of a stack.',
        'Stack applications include function call management with recursion, undo redo operations, expression evaluation and conversion between infix and postfix, balanced parentheses checking and backtracking.'),
      long('Explain how an infix expression is converted to postfix using a stack with an example.',
        'Scan the infix expression left to right. Operands are added directly to the output. Operators are pushed on the stack after popping operators of higher or equal precedence to the output. Left parenthesis is pushed and right parenthesis pops until the left parenthesis. At the end pop all remaining operators. Example A+B*C becomes ABC*+.')
    ]
  },
  {
    name: 'Trees',
    match: ['tree', 'binary', 'bst', 'traversal', 'heap', 'node'],
    items: [
      mcq('Which traversal of a Binary Search Tree gives the elements in sorted order?', 'Inorder', ['Preorder', 'Postorder', 'Level order']),
      mcq('What is the maximum number of nodes in a binary tree of height h (root at height 0)?', '2^(h+1) - 1', ['2^h', '2h + 1', 'h^2']),
      short('State the property of a Binary Search Tree.',
        'For every node all keys in the left subtree are smaller than the node key and all keys in the right subtree are greater, which allows search insertion and deletion in O(log n) for a balanced tree.'),
      long('Explain inorder, preorder and postorder tree traversals with an example.',
        'Inorder visits left subtree then root then right subtree. Preorder visits root then left then right and is used to copy a tree. Postorder visits left then right then root and is used to delete a tree. Each traversal visits every node once in O(n) time and recursion or an explicit stack can be used.')
    ]
  },
  {
    name: 'Sorting and Searching',
    match: ['sort', 'search', 'quick', 'merge', 'bubble', 'binary search', 'complexity'],
    items: [
      mcq('What is the worst case time complexity of Quick Sort?', 'O(n^2)', ['O(n log n)', 'O(n)', 'O(log n)']),
      mcq('Binary search can be applied only on which kind of data?', 'Sorted data', ['Unsorted data', 'Linked data only', 'Duplicate free data only']),
      short('Differentiate between Merge Sort and Quick Sort.',
        'Merge sort always divides the array into halves and merges them with O(n log n) time in all cases but needs O(n) extra space and is stable. Quick sort partitions around a pivot, works in place with average O(n log n) but worst case O(n^2) and is not stable.'),
      long('Explain the Quick Sort algorithm with its best, average and worst case time complexities.',
        'Quick sort picks a pivot, partitions the array so smaller elements go left and larger go right, then recursively sorts both parts. Best and average case time is O(n log n) when partitions are balanced. Worst case is O(n^2) when the pivot is always the smallest or largest element, for example on already sorted data. It sorts in place using O(log n) stack space.')
    ]
  }
];

const DBMS: BankTopic[] = [
  {
    name: 'ER Model and Normalization',
    match: ['er model', 'normalization', 'normal form', 'entity', 'relationship', 'functional dependency', 'design'],
    items: [
      mcq('Which normal form removes partial functional dependencies?', 'Second Normal Form (2NF)', ['First Normal Form (1NF)', 'Third Normal Form (3NF)', 'BCNF']),
      mcq('In an ER diagram, a rectangle represents', 'An entity', ['An attribute', 'A relationship', 'A key']),
      short('What is normalization and why is it needed?',
        'Normalization is the process of organizing tables to reduce data redundancy and avoid insertion, update and deletion anomalies by decomposing relations using functional dependencies.'),
      long('Explain 1NF, 2NF and 3NF with suitable examples.',
        '1NF requires atomic values with no repeating groups. 2NF requires 1NF and that no non-key attribute depends on part of a composite primary key, removing partial dependency. 3NF requires 2NF and no transitive dependency where a non-key attribute depends on another non-key attribute. Each step reduces redundancy.')
    ]
  },
  {
    name: 'SQL Queries',
    match: ['sql', 'query', 'select', 'group by', 'aggregate', 'ddl', 'dml'],
    items: [
      mcq('Which SQL clause is used to filter groups created by GROUP BY?', 'HAVING', ['WHERE', 'ORDER BY', 'LIMIT']),
      mcq('Which SQL command is used to remove a table structure along with its data?', 'DROP', ['DELETE', 'TRUNCATE', 'REMOVE']),
      short('Differentiate between DELETE and TRUNCATE commands.',
        'DELETE is a DML command that removes selected rows using a WHERE clause and can be rolled back. TRUNCATE is a DDL command that removes all rows quickly, cannot use WHERE and resets the table without logging each row.'),
      long('Explain DDL, DML and DCL commands in SQL with examples.',
        'DDL commands such as CREATE ALTER and DROP define or change the structure of database objects. DML commands such as SELECT INSERT UPDATE and DELETE manipulate the data stored in tables. DCL commands such as GRANT and REVOKE control access permissions of users on database objects.')
    ]
  },
  {
    name: 'Transactions and ACID',
    match: ['transaction', 'acid', 'concurrency', 'commit', 'rollback', 'isolation', 'recovery'],
    items: [
      mcq('In the ACID properties of a transaction, the letter A stands for', 'Atomicity', ['Availability', 'Aggregation', 'Authorization']),
      mcq('Which SQL command permanently saves the changes made by a transaction?', 'COMMIT', ['ROLLBACK', 'SAVEPOINT', 'GRANT']),
      short('What is the isolation property of a transaction?',
        'Isolation ensures that concurrently executing transactions do not interfere with each other so the result is the same as if the transactions ran one after another and intermediate states are not visible.'),
      long('Explain the ACID properties of a transaction with a bank transfer example.',
        'Atomicity means all operations of the transfer happen or none do. Consistency means the database moves from one valid state to another so the total money stays the same. Isolation means concurrent transfers do not affect each other. Durability means once committed the changes persist even after a system failure.')
    ]
  },
  {
    name: 'Keys and Joins',
    match: ['key', 'join', 'primary', 'foreign', 'candidate', 'relational'],
    items: [
      mcq('Which type of join returns all rows from the left table and matching rows from the right table?', 'LEFT OUTER JOIN', ['INNER JOIN', 'RIGHT OUTER JOIN', 'CROSS JOIN']),
      mcq('A primary key column can contain', 'Only unique and non-null values', ['Duplicate values', 'Null values', 'Only numeric values']),
      short('What is a foreign key?',
        'A foreign key is a column or set of columns in one table that refers to the primary key of another table and enforces referential integrity between the two tables.'),
      long('Explain the different types of SQL joins with examples.',
        'INNER JOIN returns only rows with matching values in both tables. LEFT JOIN returns all rows from the left table with matching rows from the right and nulls otherwise. RIGHT JOIN does the reverse. FULL OUTER JOIN returns all rows from both tables. CROSS JOIN returns the cartesian product of both tables.')
    ]
  }
];

export const SUBJECT_BANK: Record<string, BankTopic[]> = {
  python: PYTHON,
  java: JAVA,
  dsa: DSA,
  dbms: DBMS
};

export const resolveSubjectKey = (subjectName: string): string | null => {
  const n = subjectName.toLowerCase();
  if (n.includes('python')) return 'python';
  if (n.includes('java') && !n.includes('javascript')) return 'java';
  if (n.includes('data structure') || n.includes('dsa') || n.includes('algorithm')) return 'dsa';
  if (n.includes('database') || n.includes('dbms') || n.includes('sql')) return 'dbms';
  return null;
};

// Default course outlines (faculty can upload/replace them).
export const DEFAULT_OUTLINES: Record<string, string> = {
  python: 'Unit 1: Data Types and Variables\nUnit 2: Control Flow and Functions\nUnit 3: Object-Oriented Programming\nUnit 4: File Handling and Exceptions',
  java: 'Unit 1: OOP Concepts in Java\nUnit 2: Exception Handling\nUnit 3: Collections Framework\nUnit 4: Multithreading',
  dsa: 'Unit 1: Arrays and Linked Lists\nUnit 2: Stacks and Queues\nUnit 3: Trees\nUnit 4: Sorting and Searching',
  dbms: 'Unit 1: ER Model and Normalization\nUnit 2: SQL Queries\nUnit 3: Transactions and ACID\nUnit 4: Keys and Joins'
};
