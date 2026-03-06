import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsBoolean } from 'class-validator';

// ==================== 角色管理 ====================

export class CreateRoleDto {
  @ApiProperty({ description: '角色标识符', example: 'vip' })
  @IsString()
  role_key: string;

  @ApiProperty({ description: '角色显示名称', example: 'VIP用户' })
  @IsString()
  role_name: string;

  @ApiPropertyOptional({ description: '角色颜色', example: '#e74c3c' })
  @IsOptional()
  @IsString()
  role_color?: string;

  @ApiProperty({ description: '角色等级(数值越高权限越大)', example: 2 })
  @IsNumber()
  role_level: number;

  @ApiPropertyOptional({ description: '角色描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @ApiProperty({ description: '角色ID' })
  @IsNumber()
  id: number;

  @ApiPropertyOptional({ description: '角色显示名称' })
  @IsOptional()
  @IsString()
  role_name?: string;

  @ApiPropertyOptional({ description: '角色颜色' })
  @IsOptional()
  @IsString()
  role_color?: string;

  @ApiPropertyOptional({ description: '角色等级' })
  @IsOptional()
  @IsNumber()
  role_level?: number;

  @ApiPropertyOptional({ description: '角色描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '状态: 1-启用 0-禁用' })
  @IsOptional()
  @IsNumber()
  status?: number;
}

// ==================== 角色权限绑定 ====================

export class RolePermissionItemDto {
  @ApiProperty({ description: '权限ID' })
  @IsNumber()
  permission_id: number;

  @ApiPropertyOptional({ description: '作用域值: * 表示所有, 具体房间ID 表示指定房间', default: '*' })
  @IsOptional()
  @IsString()
  scope_value?: string;

  @ApiPropertyOptional({ description: '权限配置参数', example: { cooldown_sec: 3 } })
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({ description: '是否启用', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ description: '权限绑定列表', type: [RolePermissionItemDto] })
  @IsArray()
  permissions: RolePermissionItemDto[];
}

// ==================== 用户角色分配 ====================

export class AssignUserRoleDto {
  @ApiProperty({ description: '角色ID' })
  @IsNumber()
  role_id: number;

  @ApiPropertyOptional({ description: '作用域值: * 表示全局, 房间ID 表示指定房间', default: '*' })
  @IsOptional()
  @IsString()
  scope_value?: string;
}
