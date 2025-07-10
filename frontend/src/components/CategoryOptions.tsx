type Category = {
  label: string
  value: string
}

const categories: Category[] = [
  { label: 'Possession Proceedings', value: 'possession' },
  { label: 'Suitability Reviews', value: 'reviews' },
  { label: 'Homelessness', value: 'homelessness' },
]

type Props = {
  onSelect: (categoryValue: string, categoryLabel: string) => void
}

const CategoryOptions = ({ onSelect }: Props) => {
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
