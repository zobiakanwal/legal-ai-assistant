import { useEffect, useState } from "react"
import api from "@/lib/api"

type Category = {
  label: string
  value: string
}

type Props = {
  onSelect: (categoryValue: string, categoryLabel: string) => void
}

const CategoryOptions = ({ onSelect }: Props) => {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories")
        const data = res.data
        const categoryList: Category[] = Object.keys(data).map((key) => ({
          label: formatLabel(key),
          value: key,
        }))
        setCategories(categoryList)
      } catch (err) {
        console.error("Failed to load categories", err)
      }
    }

    fetchCategories()
  }, [])

  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value, cat.label)}
          className="bg-brand/90 text-white px-4 py-2 rounded-xl text-sm hover:bg-brand transition"
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

export default CategoryOptions
