import React, { useState } from "react";

const DragDropTables = () => {
    const [tables, setTables] = useState({
        table1: ["Элемент 1", "Элемент 2", "Элемент 3", "Элемент 4", "Элемент 5"],
        table2: ["Элемент A", "Элемент B", "Элемент C", "Элемент D", "Элемент E"]
    });

    const handleDragStart = (e, item, fromTable) => {
        e.dataTransfer.setData("item", item);
        e.dataTransfer.setData("fromTable", fromTable);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.target.style.backgroundColor = "#ddd"; // Подсветка для визуализации
    };

    const handleDragLeave = (e) => {
        e.target.style.backgroundColor = ""; // Убираем подсветку
    };

    const handleDrop = (e, toTable) => {
        e.preventDefault();

        const item = e.dataTransfer.getData("item");
        const fromTable = e.dataTransfer.getData("fromTable");

        if (fromTable !== toTable) {
            // Определяем исходную и целевую таблицы
            const sourceArray = tables[fromTable];
            const targetArray = tables[toTable];

            // Находим индекс перетаскиваемого элемента
            const sourceItemIndex = sourceArray.indexOf(item);
            // Находим индекс элемента, на который перетаскивается новый элемент
            const targetItemIndex = Array.from(e.target.closest("tr").children).indexOf(e.target);

            if (sourceItemIndex === -1 || targetItemIndex === -1 || sourceItemIndex === targetItemIndex) return;

            // Создаем копии массивов и меняем элементы местами
            const newSourceArray = [...sourceArray];
            const newTargetArray = [...targetArray];

            // Убираем элемент из исходной таблицы и вставляем в целевую
            const movedItem = newSourceArray[sourceItemIndex];
            newSourceArray.splice(sourceItemIndex, 1); // Удаляем элемент из исходной таблицы
            newTargetArray.splice(targetItemIndex, 0, movedItem); // Вставляем элемент в целевую таблицу

            // Убираем элемент из целевой таблицы, на место которого мы вставляем новый элемент,
            // и вставляем его в исходную таблицу
            const targetItem = newTargetArray[targetItemIndex];
            newTargetArray.splice(targetItemIndex, 1); // Убираем элемент из целевой таблицы
            newSourceArray.splice(sourceItemIndex, 0, targetItem); // Вставляем элемент в исходную таблицу

            // Обновляем состояние
            setTables(prevState => ({
                ...prevState,
                [fromTable]: newSourceArray,
                [toTable]: newTargetArray
            }));
        } else {
            // Перетаскивание внутри одной таблицы
            const sourceArray = tables[fromTable];
            const targetIndex = e.target.innerText === item ? sourceArray.length - 1 : sourceArray.indexOf(e.target.innerText);
            const itemIndex = sourceArray.indexOf(item);

            if (itemIndex === targetIndex) return;

            const newSourceArray = [...sourceArray];
            newSourceArray.splice(itemIndex, 1);
            newSourceArray.splice(targetIndex, 0, item);

            // Обновляем состояние для текущей таблицы
            setTables(prevState => ({
                ...prevState,
                [fromTable]: newSourceArray
            }));
        }

        e.target.style.backgroundColor = ""; // Сброс подсветки
    };

    return (
        <div style={{ display: "flex", gap: "20px" }}>
            {Object.keys(tables).map((tableName) => (
                <Table
                    key={tableName}
                    title={tableName}
                    items={tables[tableName]}
                    onDragStart={(e, item) => handleDragStart(e, item, tableName)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, tableName)}
                />
            ))}
        </div>
    );
};

const Table = ({ title, items, onDragStart, onDragOver, onDragLeave, onDrop }) => {
    return (
        <table
            onDragOver={onDragOver} // Разрешаем дроп
            onDrop={onDrop}
            style={{ width: "200px", border: "1px solid black", textAlign: "center" }}
        >
            <thead>
                <tr>
                    <th>{title}</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr
                        key={item}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        style={{ cursor: "grab", background: "#f9f9f9" }}
                    >
                        <td>{item}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default DragDropTables;
