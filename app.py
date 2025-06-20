from flask import Flask, render_template, jsonify, request
import threading
import time

app = Flask(__name__)

# 4部电梯状态
elevators = [
    {   # 电梯1 (全楼层)
        'id': 1,
        'current_floor': 1,
        'target_floors': [],
        'direction': 'idle',
        'max_floor': 34
    },
    {   # 电梯2 (全楼层)
        'id': 2,
        'current_floor': 1,
        'target_floors': [],
        'direction': 'idle',
        'max_floor': 34
    },
    {   # 电梯3 (仅1-12层)
        'id': 3,
        'current_floor': 1,
        'target_floors': [],
        'direction': 'idle',
        'max_floor': 12
    },
    {   # 电梯4 (仅1-12层)
        'id': 4,
        'current_floor': 1,
        'target_floors': [],
        'direction': 'idle',
        'max_floor': 12
    }
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({'elevators': elevators})

@app.route('/call', methods=['POST'])
def call_elevator():
    floor = int(request.json['floor'])
    elevator_id = int(request.json.get('elevator_id', 1))  # 默认为电梯1
    
    # 检查楼层是否在电梯服务范围内
    if floor > elevators[elevator_id-1]['max_floor']:
        return jsonify({'success': False, 'error': '该电梯不到达此楼层'})
    
    if floor not in elevators[elevator_id-1]['target_floors']:
        elevators[elevator_id-1]['target_floors'].append(floor)
        update_direction(elevator_id-1)
    return jsonify({'success': True})

@app.route('/select', methods=['POST'])
def select_floor():
    floor = int(request.json['floor'])
    elevator_id = int(request.json['elevator_id'])
    
    # 检查楼层是否在电梯服务范围内
    if floor > elevators[elevator_id-1]['max_floor']:
        return jsonify({'success': False, 'error': '该电梯不到达此楼层'})
    
    if floor not in elevators[elevator_id-1]['target_floors']:
        elevators[elevator_id-1]['target_floors'].append(floor)
        update_direction(elevator_id-1)
    return jsonify({'success': True})

def update_direction(elevator_idx):
    elevator = elevators[elevator_idx]
    if not elevator['target_floors']:
        elevator['direction'] = 'idle'
    elif elevator['current_floor'] < max(elevator['target_floors']):
        elevator['direction'] = 'up'
    elif elevator['current_floor'] > min(elevator['target_floors']):
        elevator['direction'] = 'down'
    else:
        elevator['direction'] = 'idle'

def simulate_movement():
    for elevator in elevators:
        if elevator['direction'] == 'up' and elevator['current_floor'] < elevator['max_floor']:
            elevator['current_floor'] += 1
        elif elevator['direction'] == 'down' and elevator['current_floor'] > 1:
            elevator['current_floor'] -= 1
        
        if elevator['current_floor'] in elevator['target_floors']:
            elevator['target_floors'].remove(elevator['current_floor'])
            update_direction(elevators.index(elevator))

# 每秒钟模拟一次电梯移动
def background_task():
    with app.app_context():
        while True:
            simulate_movement()
            time.sleep(0.5)  # 加快模拟速度

# 初始化电梯位置
elevators[0]['current_floor'] = 5
elevators[1]['current_floor'] = 15
elevators[2]['current_floor'] = 3
elevators[3]['current_floor'] = 8

# 启动后台线程
thread = threading.Thread(target=background_task)
thread.daemon = True
thread.start()

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, debug=True)
        print("服务器已启动，请访问 http://localhost:5000")
    except Exception as e:
        print(f"启动服务器失败: {e}")
        print("请检查：")
        print("1. 5000端口是否被占用（可使用 netstat -ano | findstr 5000 查看）")
        print("2. 防火墙是否允许5000端口")