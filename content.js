console.log("content.jsが実行されました");

window.addEventListener('load', () => {
    console.log("ページがロードされました");

    // 要素が遅れてレンダリングされる可能性があるため、少し待機してから実行
    setTimeout(() => {
        // すべての .compare-row クラスを持つ要素を取得
        const rows = document.querySelectorAll('.compare-row');
        console.log(`取得した行数: ${rows.length}`);

        // .compare-row クラスを持つ要素が見つからなかった場合のエラーメッセージを表示
        if (rows.length === 0) {
            console.error("セレクタにマッチする行が見つかりませんでした。\nHTML構造を確認してください。またはクラス名が変更されていないかご確認ください。");
        } else {
            // すべての取得した行をループ処理
            rows.forEach((row, rowIndex) => {
                // 各行内のすべてのセル (.compare-column, .compare-cell) を取得
                const cells = row.querySelectorAll('.compare-column, .compare-cell');
                console.log(`行 ${rowIndex + 1} のセル数: ${cells.length}`);

                // セルが複数ある場合のみ比較処理を行う
                if (cells.length > 1) {
                    // 各セルのテキスト内容を配列として取得し、空白を取り除く
                    let valuesArray = Array.from(cells).map(cell => cell.textContent.trim());
                    console.log(`行 ${rowIndex + 1} のセルの値:`, valuesArray);
                    let isDifferent = false;

                    // 最初のセルの値を基準に他のセルと比較
                    for (let i = 1; i < valuesArray.length; i++) {
                        if (valuesArray[i] !== valuesArray[0]) {
                            isDifferent = true; // 異なる値が見つかった場合にフラグを立てる
                            break; // 異なる値が見つかったらループを抜ける
                        }
                    }

                    // 異なる値が存在する場合は背景色を設定
                    if (isDifferent) {
                        row.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; // パステル黄色
                        console.log(`行 ${rowIndex + 1} に異なる値が見つかったため、背景色を適用しました。`);
                    }
                }
            });
            console.log(`${rows.length} 個の行をチェックしました。`);
        }
    }, 1000); // 1秒待機してから要素を探す
});
