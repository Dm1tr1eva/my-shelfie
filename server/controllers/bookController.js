const Book = require('../models/book')
const mongoose = require('mongoose')

async function createBook(req, res) {
    try {
        const book = await Book.create({ ...req.body, userId: req.userId })
        res.status(201).json(book)
    } catch (err) {
        res.status(500).json({ error: "Failed to create book" });
    }
    
}

async function getBooks(req, res) {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const filter = { userId: req.userId }
        if (status) filter.status = status

        const books = await Book.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))

        const total = await Book.countDocuments(filter)

        res.json({ books, total, page: Number(page), limit: Number(limit) })
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch books" });
    }
}

async function getBook(req, res) {
    try {
        const book = await Book.findOne({ _id: req.params.id, userId: req.userId })

        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        res.json(book)
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch book" });
    }
}

// Fields the client is allowed to change. Anything else in req.body is ignored:
// otherwise a request could overwrite userId and hand the book to another user.
const UPDATABLE_FIELDS = [
    "title",
    "author",
    "coverUrl",
    "description",
    "status",
    "rating",
    "review",
    "startedAt",
    "finishedAt",
]

async function updateBook(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ error: "Book not found" });
        }

        const body = req.body || {}
        const updates = {}
        for (const field of UPDATABLE_FIELDS) {
            if (field in body) updates[field] = body[field]
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No updatable fields provided" });
        }

        const book = await Book.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            updates,
            { returnDocument: "after", runValidators: true }
        )

        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        res.json(book)
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Failed to update book" });
    }
}

async function deleteBook(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ error: "Book not found" });
        }

        const book = await Book.findOneAndDelete({ _id: req.params.id, userId: req.userId })

        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        res.status(204).end()
    } catch (err) {
        res.status(500).json({ error: "Failed to delete book" });
    }
}

module.exports = {createBook, getBooks, getBook, updateBook, deleteBook}