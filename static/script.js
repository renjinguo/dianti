document.addEventListener('DOMContentLoaded', function() {
    const elevatorHeight = 50; // 每层楼的高度（像素）
    const totalFloors = 34;

    // 获取电梯状态
    function fetchElevatorStatus() {
        fetch('/status')
            .then(response => response.json())
            .then(data => {
                data.elevators.forEach(elevator => {
                    const elevatorElement = document.getElementById(`elevator-${elevator.id}`);
                    const floorDisplay = elevatorElement.querySelector('.current-floor');
                    const statusDisplay = elevatorElement.querySelector('.elevator-status');
                    
                    floorDisplay.textContent = elevator.current_floor;
                    updateElevatorPosition(elevator.id, elevator.current_floor);
                    
                    // 更新状态显示
                    statusDisplay.className = 'elevator-status ' + elevator.direction;
                    statusDisplay.textContent = 
                        elevator.direction === 'idle' ? '空闲' :
                        elevator.direction === 'up' ? '上行 ▲' : '下行 ▼';
                });
            });
    }

    // 更新电梯位置
    function updateElevatorPosition(elevatorId, floor) {
        const position = (floor - 1) * elevatorHeight;
        document.getElementById(`elevator-${elevatorId}`).style.bottom = `${position}px`;
    }

    // 处理楼层按钮点击
    document.querySelectorAll('.floor-btn').forEach(button => {
        button.addEventListener('click', function() {
            const floor = parseInt(this.dataset.floor);
            // 选择最合适的电梯
            const elevatorId = findBestElevator(floor);
            callElevator(elevatorId, floor);
        });
    });

    // 处理电梯内部按钮点击
    document.querySelectorAll('.elevator-btn').forEach(button => {
        button.addEventListener('click', function() {
            const floor = parseInt(this.dataset.floor);
            const elevatorId = parseInt(this.dataset.elevator);
            selectFloor(elevatorId, floor);
        });
    });

    // 电梯调度算法
    function findBestElevator(targetFloor) {
        // 检查是否为限制楼层
        if (targetFloor >= 20 && targetFloor <= 25) {
            alert('20-25层为限制区域，电梯不能停靠');
            return null;
        }

        const elevators = Array.from(document.querySelectorAll('.elevator'));
        const availableElevators = [];
        
        // 收集所有电梯信息
        elevators.forEach(elevator => {
            const id = parseInt(elevator.id.split('-')[1]);
            const currentFloor = parseInt(elevator.querySelector('.current-floor').textContent);
            const direction = elevator.querySelector('.elevator-status').className.split(' ')[1];
            
            // 检查电梯是否能到达目标楼层
            if (id <= 2 || targetFloor <= 12) {
                availableElevators.push({
                    id,
                    currentFloor,
                    direction,
                    distance: Math.abs(currentFloor - targetFloor)
                });
            }
        });

        if (availableElevators.length === 0) {
            alert('没有电梯能到达该楼层');
            return null;
        }

        // 优先选择空闲且距离最近的电梯
        const idleElevators = availableElevators.filter(e => e.direction === 'idle');
        if (idleElevators.length > 0) {
            idleElevators.sort((a, b) => {
                if (a.distance === b.distance) {
                    // 距离相同时，下行优先（修正后的逻辑）
                    return b.direction === 'down' ? 1 : -1;
                }
                return a.distance - b.distance;
            });
            return idleElevators[0].id;
        }

        // 其次选择同方向移动且距离最近的电梯
        const sameDirectionElevators = availableElevators.filter(e => 
            (e.direction === 'up' && e.currentFloor <= targetFloor) ||
            (e.direction === 'down' && e.currentFloor >= targetFloor)
        );
        if (sameDirectionElevators.length > 0) {
            sameDirectionElevators.sort((a, b) => {
                if (a.distance === b.distance) {
                    // 距离相同时，下行优先
                    return a.direction === 'down' ? -1 : 1;
                }
                return a.distance - b.distance;
            });
            return sameDirectionElevators[0].id;
        }

        // 最后选择反方向移动但距离最近的电梯
        availableElevators.sort((a, b) => {
            if (a.distance === b.distance) {
                // 距离相同时，下行优先
                return a.direction === 'down' ? -1 : 1;
            }
            return a.distance - b.distance;
        });
        return availableElevators[0].id;
    }

    // 呼叫电梯
    function callElevator(elevatorId, floor) {
        fetch('/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                elevator_id: elevatorId,
                floor: floor 
            })
        });
    }

    // 选择目标楼层
    function selectFloor(elevatorId, floor) {
        fetch('/select', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                elevator_id: elevatorId,
                floor: floor 
            })
        });
    }

    // 更新电梯状态（更频繁）
    function startStatusUpdates() {
        fetchElevatorStatus().catch(err => {
            console.error('获取电梯状态失败:', err);
            // 重试机制
            setTimeout(startStatusUpdates, 1000);
        });
    }

    // 每500ms更新一次电梯状态
    setInterval(startStatusUpdates, 500);

    // 初始获取状态
    startStatusUpdates();
});